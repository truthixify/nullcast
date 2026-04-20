"use client";

import { useReadContract, useReadContracts } from "wagmi";
import { hexToString } from "viem";
import { getMarketConfig } from "@/lib/contracts";

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
    ],
    query: {
      refetchInterval: options?.refetchInterval,
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

  const category = categoryRaw
    ? hexToString(categoryRaw, { size: 32 }).replace(/\0+$/, "")
    : undefined;

  const yesPool = publicYesPool ? Number(publicYesPool) / 1e6 : 0;
  const noPool = publicNoPool ? Number(publicNoPool) / 1e6 : 0;
  const totalPool = yesPool + noPool;
  const yesOdds = totalPool > 0 ? Math.round((yesPool / totalPool) * 100) : 50;
  const noOdds = 100 - yesOdds;

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
    totalPool,
    yesOdds,
    noOdds,
    isLoading,
    error,
    refetch,
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
