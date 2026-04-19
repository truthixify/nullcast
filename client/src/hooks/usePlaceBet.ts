"use client";

import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { getMarketConfig } from "@/lib/contracts";

export function usePlaceBet(marketAddress: `0x${string}`) {
  const config = getMarketConfig(marketAddress);

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

  const placeBet = (
    encryptedAmount: `0x${string}`,
    inputProof: `0x${string}`,
    isYes: boolean
  ) => {
    writeContract({
      ...config,
      functionName: "placeBet",
      args: [encryptedAmount, inputProof, isYes],
    });
  };

  return {
    placeBet,
    hash,
    isWriting,
    isConfirming,
    isConfirmed,
    error: writeError || confirmError,
  };
}

export function usePlaceBucketBet(marketAddress: `0x${string}`) {
  const config = getMarketConfig(marketAddress);

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

  const placeBucketBet = (
    encryptedAmount: `0x${string}`,
    inputProof: `0x${string}`,
    bucketId: number
  ) => {
    writeContract({
      ...config,
      functionName: "placeBucketBet",
      args: [encryptedAmount, inputProof, bucketId],
    });
  };

  return {
    placeBucketBet,
    hash,
    isWriting,
    isConfirming,
    isConfirmed,
    error: writeError || confirmError,
  };
}
