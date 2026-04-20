"use client";

import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import LiquidityPoolABI from "@/constants/abis/LiquidityPool.json";

function getPoolConfig(address: `0x${string}`) {
  return { address, abi: LiquidityPoolABI } as const;
}

/**
 * Read aggregate pool stats: publicTotalLiquidity and LP count.
 */
export function useLiquidityPool(poolAddress: `0x${string}`) {
  const config = getPoolConfig(poolAddress);

  const { data: publicTotalLiquidity, isLoading: isLiqLoading } = useReadContract({
    ...config,
    functionName: "publicTotalLiquidity",
  });

  const { data: lpCount, isLoading: isCountLoading } = useReadContract({
    ...config,
    functionName: "getLPCount",
  });

  return {
    totalLiquidity: publicTotalLiquidity ? Number(publicTotalLiquidity) / 1e6 : 0,
    lpCount: lpCount ? Number(lpCount) : 0,
    isLoading: isLiqLoading || isCountLoading,
  };
}

/**
 * Check whether a given address is an active LP in the pool.
 */
export function useIsLP(poolAddress: `0x${string}`, userAddress?: `0x${string}`) {
  const config = getPoolConfig(poolAddress);

  const { data, isLoading } = useReadContract({
    ...config,
    functionName: "isLP",
    args: userAddress ? [userAddress] : undefined,
    query: { enabled: !!userAddress },
  });

  return { isLP: data as boolean | undefined, isLoading };
}

/**
 * Write hook: addLiquidity(encryptedAmount, inputProof)
 */
export function useAddLiquidity(poolAddress: `0x${string}`) {
  const config = getPoolConfig(poolAddress);

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

  const addLiquidity = (encryptedAmount: `0x${string}`, inputProof: `0x${string}`) => {
    writeContract({
      ...config,
      functionName: "addLiquidity",
      args: [encryptedAmount, inputProof],
    });
  };

  return {
    addLiquidity,
    hash,
    isWriting,
    isConfirming,
    isConfirmed,
    error: writeError || confirmError,
  };
}

/**
 * Write hook: withdrawLiquidity()
 */
export function useWithdrawLiquidity(poolAddress: `0x${string}`) {
  const config = getPoolConfig(poolAddress);

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

  const withdrawLiquidity = () => {
    writeContract({ ...config, functionName: "withdrawLiquidity" });
  };

  return {
    withdrawLiquidity,
    hash,
    isWriting,
    isConfirming,
    isConfirmed,
    error: writeError || confirmError,
  };
}

/**
 * Write hook: claimFees()
 */
export function useClaimLPFees(poolAddress: `0x${string}`) {
  const config = getPoolConfig(poolAddress);

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

  const claimFees = () => {
    writeContract({ ...config, functionName: "claimFees" });
  };

  return {
    claimFees,
    hash,
    isWriting,
    isConfirming,
    isConfirmed,
    error: writeError || confirmError,
  };
}
