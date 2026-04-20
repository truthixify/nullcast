"use client";

import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { nullCastFactoryConfig } from "@/lib/contracts";

export function useFactoryMarkets() {
  const { data: marketCount, isLoading: isCountLoading } = useReadContract({
    ...nullCastFactoryConfig,
    functionName: "getMarketCount",
  });

  const { data: allMarkets, isLoading: isMarketsLoading } = useReadContract({
    ...nullCastFactoryConfig,
    functionName: "getAllMarkets",
  });

  return {
    marketCount: marketCount ? Number(marketCount) : 0,
    allMarkets: (allMarkets as `0x${string}`[]) || [],
    isLoading: isCountLoading || isMarketsLoading,
  };
}

export function useCreateMarket() {
  const {
    writeContract,
    data: hash,
    isPending: isWriting,
    error: writeError,
  } = useWriteContract();

  const {
    isLoading: isConfirming,
    isSuccess: isConfirmed,
    error: confirmError,
  } = useWaitForTransactionReceipt({ hash });

  const createMarket = (
    question: string,
    expiryBlock: bigint,
    minimumBet: bigint,
    bucketCount: number = 0,
    category: `0x${string}` = "0x0000000000000000000000000000000000000000000000000000000000000000"
  ) => {
    writeContract({
      ...nullCastFactoryConfig,
      functionName: "createMarket",
      args: [question, expiryBlock, minimumBet, bucketCount, category],
    });
  };

  return {
    createMarket,
    hash,
    isWriting,
    isConfirming,
    isConfirmed,
    error: writeError || confirmError,
  };
}
