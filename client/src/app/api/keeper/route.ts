import { NextResponse } from "next/server";
import { createPublicClient, createWalletClient, http, parseAbi } from "viem";
import { sepolia } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import { CONTRACT_ADDRESSES } from "@/constants/addresses";

const rpcUrl =
  process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL ||
  "https://ethereum-sepolia-rpc.publicnode.com";
const rawKey = process.env.DEPLOYER_PRIVATE_KEY;
const deployerKey = rawKey
  ? (rawKey.startsWith("0x") ? rawKey : `0x${rawKey}`) as `0x${string}`
  : undefined;

const RELAYER_URL = "https://relayer.testnet.zama.org/v2";

const factoryAbi = parseAbi([
  "function getMarketCount() view returns (uint256)",
  "function getLiquidityPool(uint256 marketId) view returns (address)",
  "function marketById(uint256) view returns (address)",
]);

const marketAbi = parseAbi([
  "function getTotalYesPoolHandle() view returns (bytes32)",
  "function getTotalNoPoolHandle() view returns (bytes32)",
  "function submitOddsUpdate(uint256 clearYes, uint256 clearNo, bytes decryptionProof)",
]);

const vaultFactoryAbi = parseAbi([
  "function getVaultCount() view returns (uint256)",
  "function vaultById(uint256) view returns (address)",
]);

const poolAbi = parseAbi([
  "function getTotalLiquidityHandle() view returns (bytes32)",
  "function publicTotalLiquidity() view returns (uint256)",
  "function setPublicTotalLiquidity(uint256 value)",
  "function getLPCount() view returns (uint256)",
]);

const vaultAbi = parseAbi([
  "function getTotalDepositsHandle() view returns (bytes32)",
  "function publicTotalDeposits() view returns (uint256)",
  "function publicTotalShares() view returns (uint256)",
  "function setPublicTotalDeposits(uint256 value)",
  "function setPublicTotalShares(uint256 value)",
  "function followerCount() view returns (uint256)",
  "function name() view returns (string)",
]);

const ZERO_HANDLE = ("0x" + "0".repeat(64)) as `0x${string}`;

/**
 * Public decrypt via Zama relayer REST API.
 * 1. POST /v2/public-decrypt → queues a job
 * 2. GET /v2/public-decrypt/:jobId → poll until succeeded
 * Returns the decrypted value as bigint.
 */
async function publicDecryptViaRelayer(
  handle: string
): Promise<bigint | null> {
  try {
    // Step 1: Submit decrypt request
    const submitRes = await fetch(`${RELAYER_URL}/public-decrypt`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ciphertextHandles: [handle],
        extraData: "0x00",
      }),
    });

    const submitData = await submitRes.json();
    if (submitData.status !== "queued" || !submitData.result?.jobId) {
      console.error("Relayer submit failed:", JSON.stringify(submitData));
      return null;
    }

    const jobId = submitData.result.jobId;

    // Step 2: Poll for result (max 30s)
    for (let attempt = 0; attempt < 15; attempt++) {
      await new Promise((r) => setTimeout(r, 2000));

      const pollRes = await fetch(`${RELAYER_URL}/public-decrypt/${jobId}`);
      const pollData = await pollRes.json();

      if (pollData.status === "succeeded" && pollData.result?.decryptedValue) {
        return BigInt("0x" + pollData.result.decryptedValue);
      }

      if (pollData.status === "failed") {
        console.error("Relayer decrypt failed:", JSON.stringify(pollData));
        return null;
      }
      // Still processing, continue polling
    }

    console.error("Relayer decrypt timed out for job:", jobId);
    return null;
  } catch (err) {
    console.error("Relayer request failed:", err);
    return null;
  }
}

/**
 * GET /api/keeper
 *
 * Updates publicTotalLiquidity for each LP pool by:
 * 1. Reading the encrypted handle
 * 2. Calling Zama relayer HTTP API for public decryption
 * 3. Submitting the cleartext via setPublicTotalLiquidity (owner-only)
 */
export async function GET() {
  if (!deployerKey) {
    return NextResponse.json(
      { error: "DEPLOYER_PRIVATE_KEY not configured in server env" },
      { status: 500 }
    );
  }

  const account = privateKeyToAccount(deployerKey);
  const publicClient = createPublicClient({
    chain: sepolia,
    transport: http(rpcUrl),
  });
  const walletClient = createWalletClient({
    chain: sepolia,
    transport: http(rpcUrl),
    account,
  });

  const results: Array<{ marketId: number; pool: string; action: string }> = [];
  const oddsResults: Array<{ marketId: number; action: string }> = [];

  try {
    const marketCount = await publicClient.readContract({
      address: CONTRACT_ADDRESSES.NullCastFactory as `0x${string}`,
      abi: factoryAbi,
      functionName: "getMarketCount",
    });

    // ── Update market odds ──────────────────────────────────────
    for (let i = 0; i < Number(marketCount); i++) {
      try {
        const marketAddr = (await publicClient.readContract({
          address: CONTRACT_ADDRESSES.NullCastFactory as `0x${string}`,
          abi: factoryAbi,
          functionName: "marketById",
          args: [BigInt(i)],
        })) as `0x${string}`;

        if (!marketAddr || marketAddr === "0x0000000000000000000000000000000000000000") continue;

        const yesHandle = (await publicClient.readContract({ address: marketAddr, abi: marketAbi, functionName: "getTotalYesPoolHandle" })) as `0x${string}`;
        const noHandle = (await publicClient.readContract({ address: marketAddr, abi: marketAbi, functionName: "getTotalNoPoolHandle" })) as `0x${string}`;

        if (yesHandle === ZERO_HANDLE || noHandle === ZERO_HANDLE) {
          oddsResults.push({ marketId: i, action: "no bets" });
          continue;
        }

        const clearYes = await publicDecryptViaRelayer(yesHandle);
        const clearNo = await publicDecryptViaRelayer(noHandle);

        if (clearYes === null || clearNo === null) {
          oddsResults.push({ marketId: i, action: "decrypt failed" });
          continue;
        }

        const txHash = await walletClient.writeContract({
          address: marketAddr,
          abi: marketAbi,
          functionName: "submitOddsUpdate",
          args: [clearYes, clearNo, "0x"],
        });
        await publicClient.waitForTransactionReceipt({ hash: txHash });
        oddsResults.push({ marketId: i, action: `YES=${Number(clearYes)/1e6} NO=${Number(clearNo)/1e6}` });
      } catch (err) {
        oddsResults.push({ marketId: i, action: `error: ${err instanceof Error ? err.message.slice(0, 60) : "unknown"}` });
      }
    }

    // ── Update LP pool totals ───────────────────────────────────
    for (let i = 0; i < Number(marketCount); i++) {
      const poolAddr = (await publicClient.readContract({
        address: CONTRACT_ADDRESSES.NullCastFactory as `0x${string}`,
        abi: factoryAbi,
        functionName: "getLiquidityPool",
        args: [BigInt(i)],
      })) as `0x${string}`;

      if (!poolAddr || poolAddr === "0x0000000000000000000000000000000000000000") {
        results.push({ marketId: i, pool: "none", action: "no pool" });
        continue;
      }

      const lpCount = await publicClient.readContract({
        address: poolAddr,
        abi: poolAbi,
        functionName: "getLPCount",
      });

      if (Number(lpCount) === 0) {
        results.push({ marketId: i, pool: poolAddr, action: "no LPs" });
        continue;
      }

      const handle = (await publicClient.readContract({
        address: poolAddr,
        abi: poolAbi,
        functionName: "getTotalLiquidityHandle",
      })) as `0x${string}`;

      if (handle === ZERO_HANDLE) {
        results.push({ marketId: i, pool: poolAddr, action: "zero handle" });
        continue;
      }

      // Decrypt via Zama relayer (async: submit → poll)
      const clearValue = await publicDecryptViaRelayer(handle);

      if (clearValue === null) {
        results.push({
          marketId: i,
          pool: poolAddr,
          action: "relayer decrypt failed",
        });
        continue;
      }

      try {
        const txHash = await walletClient.writeContract({
          address: poolAddr,
          abi: poolAbi,
          functionName: "setPublicTotalLiquidity",
          args: [clearValue],
        });

        await publicClient.waitForTransactionReceipt({ hash: txHash });

        results.push({
          marketId: i,
          pool: poolAddr,
          action: `updated to ${Number(clearValue) / 1e6} cUSDT`,
        });
      } catch (err) {
        results.push({
          marketId: i,
          pool: poolAddr,
          action: `tx error: ${err instanceof Error ? err.message : "unknown"}`,
        });
      }
    }

    // ── Sync vault total deposits ──────────────────────────────
    const vaultResults: Array<{ vaultId: number; vault: string; action: string }> = [];

    try {
      const vaultCount = await publicClient.readContract({
        address: CONTRACT_ADDRESSES.VaultFactory as `0x${string}`,
        abi: vaultFactoryAbi,
        functionName: "getVaultCount",
      });

      for (let v = 0; v < Number(vaultCount); v++) {
        const vaultAddr = (await publicClient.readContract({
          address: CONTRACT_ADDRESSES.VaultFactory as `0x${string}`,
          abi: vaultFactoryAbi,
          functionName: "vaultById",
          args: [BigInt(v)],
        })) as `0x${string}`;

        if (!vaultAddr || vaultAddr === "0x0000000000000000000000000000000000000000") {
          vaultResults.push({ vaultId: v, vault: "none", action: "no vault" });
          continue;
        }

        const followers = await publicClient.readContract({
          address: vaultAddr,
          abi: vaultAbi,
          functionName: "followerCount",
        });

        if (Number(followers) === 0) {
          vaultResults.push({ vaultId: v, vault: vaultAddr, action: "no followers" });
          continue;
        }

        const handle = (await publicClient.readContract({
          address: vaultAddr,
          abi: vaultAbi,
          functionName: "getTotalDepositsHandle",
        })) as `0x${string}`;

        if (handle === ZERO_HANDLE) {
          vaultResults.push({ vaultId: v, vault: vaultAddr, action: "zero handle" });
          continue;
        }

        const clearValue = await publicDecryptViaRelayer(handle);

        if (clearValue === null) {
          vaultResults.push({ vaultId: v, vault: vaultAddr, action: "decrypt failed" });
          continue;
        }

        try {
          // Set public total shares (decrypted from the handle)
          const txShares = await walletClient.writeContract({
            address: vaultAddr,
            abi: vaultAbi,
            functionName: "setPublicTotalShares",
            args: [clearValue],
          });
          await publicClient.waitForTransactionReceipt({ hash: txShares });

          // Also set public total deposits to same value for now
          // (vault balance tracking requires reading encrypted cUSDT balance)
          const txDeposits = await walletClient.writeContract({
            address: vaultAddr,
            abi: vaultAbi,
            functionName: "setPublicTotalDeposits",
            args: [clearValue],
          });
          await publicClient.waitForTransactionReceipt({ hash: txDeposits });

          const vaultName = await publicClient.readContract({
            address: vaultAddr,
            abi: vaultAbi,
            functionName: "name",
          });

          vaultResults.push({
            vaultId: v,
            vault: vaultAddr,
            action: `${vaultName}: shares=${Number(clearValue)}`,
          });
        } catch (err) {
          vaultResults.push({
            vaultId: v,
            vault: vaultAddr,
            action: `tx error: ${err instanceof Error ? err.message : "unknown"}`,
          });
        }
      }
    } catch (vaultErr) {
      vaultResults.push({
        vaultId: -1,
        vault: CONTRACT_ADDRESSES.VaultFactory,
        action: `factory error: ${vaultErr instanceof Error ? vaultErr.message : "unknown"}`,
      });
    }

    const allResults = [...results.map(r => ({ ...r, type: "pool" as const })), ...vaultResults.map(r => ({ ...r, type: "vault" as const }))];
    const totalUpdated = allResults.filter(r => r.action.startsWith("updated") || r.action.includes("updated to")).length;

    return NextResponse.json({
      ok: true,
      timestamp: new Date().toISOString(),
      updated: totalUpdated,
      odds: oddsResults,
      pools: results,
      vaults: vaultResults,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
