import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, http, parseAbi } from "viem";
import { sepolia } from "viem/chains";
import { CONTRACT_ADDRESSES } from "@/constants/addresses";

const rpcUrl =
  process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL ||
  "https://ethereum-sepolia-rpc.publicnode.com";

const RELAYER_URL = "https://relayer.testnet.zama.org/v2";

const factoryAbi = parseAbi([
  "function getMarketCount() view returns (uint256)",
  "function marketById(uint256) view returns (address)",
]);

const marketAbi = parseAbi([
  "function getTotalYesPoolHandle() view returns (bytes32)",
  "function getTotalNoPoolHandle() view returns (bytes32)",
]);

const ZERO_HANDLE = ("0x" + "0".repeat(64)) as `0x${string}`;

// In-memory cache: marketAddress -> { yesPool, noPool, timestamp }
const oddsCache = new Map<
  string,
  { yesPool: number; noPool: number; timestamp: number }
>();
const CACHE_TTL_MS = 15_000; // 15 seconds

async function publicDecrypt(handle: string): Promise<bigint | null> {
  try {
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
      return null;
    }

    const jobId = submitData.result.jobId;

    for (let attempt = 0; attempt < 15; attempt++) {
      await new Promise((r) => setTimeout(r, 2000));

      const pollRes = await fetch(`${RELAYER_URL}/public-decrypt/${jobId}`);
      const pollData = await pollRes.json();

      if (pollData.status === "succeeded" && pollData.result?.decryptedValue) {
        return BigInt("0x" + pollData.result.decryptedValue);
      }

      if (pollData.status === "failed") {
        return null;
      }
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * GET /api/odds?market=0x...
 * Returns decrypted pool totals and computed odds for a specific market.
 *
 * GET /api/odds (no query param)
 * Returns odds for ALL markets.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const marketParam = searchParams.get("market");
  const fresh = searchParams.get("fresh") === "1"; // Bypass cache when fresh=1

  const publicClient = createPublicClient({
    chain: sepolia,
    transport: http(rpcUrl),
  });

  // If a specific market is requested
  if (marketParam) {
    if (!fresh) {
      const cached = oddsCache.get(marketParam.toLowerCase());
      if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
        const total = cached.yesPool + cached.noPool;
        return NextResponse.json({
          market: marketParam,
          yesPool: cached.yesPool,
          noPool: cached.noPool,
          totalBettingPool: total,
          yesOdds: total > 0 ? Math.round((cached.yesPool / total) * 100) : 50,
          noOdds: total > 0 ? Math.round((cached.noPool / total) * 100) : 50,
          cached: true,
        });
      }
    }

    const result = await decryptMarketOdds(publicClient, marketParam as `0x${string}`, fresh);
    return NextResponse.json(result);
  }

  // Otherwise, decrypt all markets
  const allOdds: Array<Record<string, unknown>> = [];

  try {
    const marketCount = await publicClient.readContract({
      address: CONTRACT_ADDRESSES.NullCastFactory as `0x${string}`,
      abi: factoryAbi,
      functionName: "getMarketCount",
    });

    for (let i = 0; i < Number(marketCount); i++) {
      const marketAddr = (await publicClient.readContract({
        address: CONTRACT_ADDRESSES.NullCastFactory as `0x${string}`,
        abi: factoryAbi,
        functionName: "marketById",
        args: [BigInt(i)],
      })) as `0x${string}`;

      if (!marketAddr || marketAddr === "0x0000000000000000000000000000000000000000") {
        continue;
      }

      const result = await decryptMarketOdds(publicClient, marketAddr);
      allOdds.push({ ...result, marketId: i });
    }
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    timestamp: new Date().toISOString(),
    markets: allOdds,
  });
}

async function decryptMarketOdds(
  publicClient: ReturnType<typeof createPublicClient>,
  marketAddress: `0x${string}`,
  skipCache = false
): Promise<Record<string, unknown>> {
  // Check cache first (skip if fresh=1 was passed)
  if (!skipCache) {
    const cached = oddsCache.get(marketAddress.toLowerCase());
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      const total = cached.yesPool + cached.noPool;
      return {
        market: marketAddress,
        yesPool: cached.yesPool,
        noPool: cached.noPool,
        totalBettingPool: total,
        yesOdds: total > 0 ? Math.round((cached.yesPool / total) * 100) : 50,
        noOdds: total > 0 ? Math.round((cached.noPool / total) * 100) : 50,
        cached: true,
      };
    }
  }

  try {
    const yesHandle = (await publicClient.readContract({
      address: marketAddress,
      abi: marketAbi,
      functionName: "getTotalYesPoolHandle",
    })) as `0x${string}`;

    const noHandle = (await publicClient.readContract({
      address: marketAddress,
      abi: marketAbi,
      functionName: "getTotalNoPoolHandle",
    })) as `0x${string}`;

    if (yesHandle === ZERO_HANDLE && noHandle === ZERO_HANDLE) {
      oddsCache.set(marketAddress.toLowerCase(), {
        yesPool: 0,
        noPool: 0,
        timestamp: Date.now(),
      });
      return {
        market: marketAddress,
        yesPool: 0,
        noPool: 0,
        totalBettingPool: 0,
        yesOdds: 50,
        noOdds: 50,
        cached: false,
      };
    }

    // Decrypt non-zero handles
    const yesVal = yesHandle !== ZERO_HANDLE ? await publicDecrypt(yesHandle) : BigInt(0);
    const noVal = noHandle !== ZERO_HANDLE ? await publicDecrypt(noHandle) : BigInt(0);

    const yesPool = Number(yesVal ?? BigInt(0)) / 1e6;
    const noPool = Number(noVal ?? BigInt(0)) / 1e6;
    const total = yesPool + noPool;

    // Cache the result
    oddsCache.set(marketAddress.toLowerCase(), {
      yesPool,
      noPool,
      timestamp: Date.now(),
    });

    return {
      market: marketAddress,
      yesPool,
      noPool,
      totalBettingPool: total,
      yesOdds: total > 0 ? Math.round((yesPool / total) * 100) : 50,
      noOdds: total > 0 ? Math.round((noPool / total) * 100) : 50,
      cached: false,
    };
  } catch (err) {
    return {
      market: marketAddress,
      error: err instanceof Error ? err.message : "decrypt failed",
      yesPool: 0,
      noPool: 0,
      totalBettingPool: 0,
      yesOdds: 50,
      noOdds: 50,
    };
  }
}
