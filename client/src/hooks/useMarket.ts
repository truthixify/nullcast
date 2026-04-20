"use client";

import { useReadContract, useReadContracts } from "wagmi";
import { hexToString } from "viem";
import { getMarketConfig } from "@/lib/contracts";
import { useOdds } from "@/hooks/useOdds";

interface UseMarketOptions {
  refetchInterval?: number;
}

export function useMarket(marketAddress: `0x${string}`, options?: UseMarketOptions) {
  const config = getMarketConfig(marketAddress);

  const { data, isLoading, error, refetch } = useReadContracts({
    contracts: [
      { ...config, functionName: "question" },
      { ...config, functionName: "status" },
      { ...config, functionName: "marketType" },
      { ...config, functionName: "expiryBlock" },
      { ...config, functionName: "minimumBet" },
      { ...config, functionName: "publicYesPool" },
      { ...config, functionName: "publicNoPool" },
      { ...config, functionName: "resolvedOutcome" },
      { ...config, functionName: "oracle" },
      { ...config, functionName: "marketId" },
      { ...config, functionName: "bucketCount" },
      { ...config, functionName: "category" },
      { ...config, functionName: "disputed" },
      { ...config, functionName: "resolvedAtBlock" },
      { ...config, functionName: "DISPUTE_WINDOW" },
      { ...config, functionName: "liquidityPool" },
    ],
    query: {
      refetchInterval: options?.refetchInterval ?? 10_000,
    },
  });

  const question = data?.[0]?.result as string | undefined;
  const status = data?.[1]?.result as number | undefined;
  const marketType = data?.[2]?.result as number | undefined;
  const expiryBlock = data?.[3]?.result as bigint | undefined;
  const minimumBet = data?.[4]?.result as bigint | undefined;
  const publicYesPool = data?.[5]?.result as bigint | undefined;
  const publicNoPool = data?.[6]?.result as bigint | undefined;
  const resolvedOutcome = data?.[7]?.result as bigint | undefined;
  const oracle = data?.[8]?.result as string | undefined;
  const marketId = data?.[9]?.result as bigint | undefined;
  const bucketCount = data?.[10]?.result as number | undefined;
  const categoryRaw = data?.[11]?.result as `0x${string}` | undefined;
  const disputed = data?.[12]?.result as boolean | undefined;
  const resolvedAtBlock = data?.[13]?.result as bigint | undefined;
  const disputeWindow = data?.[14]?.result as bigint | undefined;
  const liquidityPoolAddr = data?.[15]?.result as string | undefined;

  const category = categoryRaw
    ? hexToString(categoryRaw, { size: 32 }).replace(/\0+$/, "")
    : undefined;

  // Read LP pool total liquidity
  const lpPoolAddress = liquidityPoolAddr && liquidityPoolAddr !== "0x0000000000000000000000000000000000000000" ? liquidityPoolAddr as `0x${string}` : undefined;
  const { data: lpTotalLiquidity } = useReadContract({
    address: lpPoolAddress,
    abi: [{ inputs: [], name: "publicTotalLiquidity", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" }],
    functionName: "publicTotalLiquidity",
    query: { enabled: !!lpPoolAddress, refetchInterval: 10_000 },
  });

  // Fetch live odds from /api/odds (decrypts encrypted pool totals via relayer)
  // Fetches once on mount, then only on explicit refreshOdds() call
  const liveOdds = useOdds(marketAddress);

  // Use live decrypted odds if available, fall back to on-chain publicYesPool/publicNoPool
  const yesPool = liveOdds.yesPool > 0 ? liveOdds.yesPool : (publicYesPool ? Number(publicYesPool) / 1e6 : 0);
  const noPool = liveOdds.noPool > 0 ? liveOdds.noPool : (publicNoPool ? Number(publicNoPool) / 1e6 : 0);
  const bettingPool = yesPool + noPool;
  const lpPool = lpTotalLiquidity ? Number(lpTotalLiquidity) / 1e6 : 0;
  const totalPool = bettingPool + lpPool;
  const yesOdds = liveOdds.totalBettingPool > 0 ? liveOdds.yesOdds : (bettingPool > 0 ? Math.round((yesPool / bettingPool) * 100) : 50);
  const noOdds = 100 - yesOdds;

  const refreshOdds = liveOdds.refresh;
  // Odds are "ready" if we got data from /api/odds OR if on-chain pools have values
  const isOddsLoading = liveOdds.isLoading && liveOdds.totalBettingPool === 0 && !publicYesPool && !publicNoPool;

  return {
    question,
    status,
    marketType,
    expiryBlock,
    minimumBet,
    publicYesPool,
    publicNoPool,
    resolvedOutcome,
    oracle,
    marketId,
    bucketCount,
    category,
    disputed,
    resolvedAtBlock,
    disputeWindow,
    yesPool,
    noPool,
    lpPool,
    totalPool,
    yesOdds,
    noOdds,
    isLoading,
    isOddsLoading,
    error,
    refetch,
    refreshOdds,
  };
}

export function useMarketOdds(marketAddress: `0x${string}`) {
  const config = getMarketConfig(marketAddress);

  const { data, isLoading } = useReadContract({
    ...config,
    functionName: "getCurrentOdds",
  });

  const yesOdds = data ? Number((data as bigint[])[0]) : 50;
  const noOdds = data ? Number((data as bigint[])[1]) : 50;

  return { yesOdds, noOdds, isLoading };
}

export function useHasPosition(marketAddress: `0x${string}`, userAddress?: `0x${string}`) {
  const config = getMarketConfig(marketAddress);

  const { data } = useReadContract({
    ...config,
    functionName: "hasPosition",
    args: userAddress ? [userAddress] : undefined,
    query: { enabled: !!userAddress },
  });

  return data as boolean | undefined;
}
