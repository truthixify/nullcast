"use client";

import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { getMarketConfig } from "@/lib/contracts";

export function useClaimWinnings(marketAddress: `0x${string}`) {
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

  const claimWinnings = () => {
    writeContract({
      ...config,
      functionName: "claimWinnings",
    });
  };

  return {
    claimWinnings,
    hash,
    isWriting,
    isConfirming,
    isConfirmed,
    error: writeError || confirmError,
  };
}
