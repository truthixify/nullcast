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
]);

const poolAbi = parseAbi([
  "function getTotalLiquidityHandle() view returns (bytes32)",
  "function publicTotalLiquidity() view returns (uint256)",
  "function setPublicTotalLiquidity(uint256 value)",
  "function getLPCount() view returns (uint256)",
]);

const ZERO_HANDLE = ("0x" + "0".repeat(64)) as `0x${string}`;

/**
 * Public decrypt via Zama relayer REST API (no WASM needed).
 * POST /v1/public-decrypt with handles array.
 */
async function publicDecryptViaRelayer(
  handles: string[]
): Promise<{ clearValues: Record<string, bigint>; decryptionProof: string } | null> {
  try {
    const res = await fetch(`${RELAYER_URL}/public-decrypt`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ handles }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error(`Relayer error ${res.status}: ${text}`);
      return null;
    }

    const data = await res.json();
    return data;
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

  try {
    const marketCount = await publicClient.readContract({
      address: CONTRACT_ADDRESSES.NullCastFactory as `0x${string}`,
      abi: factoryAbi,
      functionName: "getMarketCount",
    });

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

      // Attempt public decrypt via relayer
      const decryptResult = await publicDecryptViaRelayer([handle]);

      if (!decryptResult) {
        results.push({
          marketId: i,
          pool: poolAddr,
          action: "relayer decrypt failed",
        });
        continue;
      }

      const clearValue = decryptResult.clearValues[handle];
      if (clearValue === undefined) {
        results.push({
          marketId: i,
          pool: poolAddr,
          action: "no clear value in response",
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

    return NextResponse.json({
      ok: true,
      timestamp: new Date().toISOString(),
      updated: results.filter((r) => r.action.startsWith("updated")).length,
      results,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
