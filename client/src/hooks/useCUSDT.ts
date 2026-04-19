"use client";

import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { mockcUSDTConfig } from "@/lib/contracts";

export function useApproveCUSDT() {
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

  const approve = (
    spender: `0x${string}`,
    encryptedAmount: `0x${string}`,
    inputProof: `0x${string}`
  ) => {
    writeContract({
      ...mockcUSDTConfig,
      functionName: "approve",
      args: [spender, encryptedAmount, inputProof],
    });
  };

  return {
    approve,
    hash,
    isWriting,
    isConfirming,
    isConfirmed,
    error: writeError || confirmError,
  };
}

export function useMintCUSDT() {
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

  const mint = (to: `0x${string}`, amount: bigint) => {
    writeContract({
      ...mockcUSDTConfig,
      functionName: "mint",
      args: [to, amount],
    });
  };

  return {
    mint,
    hash,
    isWriting,
    isConfirming,
    isConfirmed,
    error: writeError || confirmError,
  };
}
