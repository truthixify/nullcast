"use client";

import { useState, useCallback } from "react";
import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { getMarketConfig } from "@/lib/contracts";

/**
 * Odds keeper: after a bet is placed, this hook:
 * 1. Reads encrypted pool handles from the market contract
 * 2. Calls the Zama relayer to publicly decrypt them
 * 3. Submits the decrypted values + KMS proof to submitOddsUpdate()
 *
 * This updates publicYesPool/publicNoPool so the UI shows fresh odds.
 */
export function useOddsKeeper(marketAddress: `0x${string}`) {
  const config = getMarketConfig(marketAddress);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: yesHandle, refetch: refetchYes } = useReadContract({
    ...config,
    functionName: "getTotalYesPoolHandle",
  });

  const { data: noHandle, refetch: refetchNo } = useReadContract({
    ...config,
    functionName: "getTotalNoPoolHandle",
  });

  const {
    writeContract,
    data: txHash,
    isPending: isWriting,
  } = useWriteContract();

  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({ hash: txHash });

  const isZeroHandle = (h: unknown): boolean => {
    if (!h) return true;
    const s = String(h).toLowerCase();
    return s === "0x" + "0".repeat(64) || s === "0x0" || s === "0x";
  };

  const updateOdds = useCallback(async () => {
    // Refetch handles to get latest values after a bet
    const [freshYes, freshNo] = await Promise.all([refetchYes(), refetchNo()]);
    const latestYes = (freshYes.data ?? yesHandle) as `0x${string}` | undefined;
    const latestNo = (freshNo.data ?? noHandle) as `0x${string}` | undefined;

    if (!latestYes || !latestNo) {
      setError("Pool handles not available yet");
      return;
    }

    // Either pool uninitialized — can't decrypt zero handles
    if (isZeroHandle(latestYes) || isZeroHandle(latestNo)) {
      setError("No bets placed yet — pools are empty");
      return;
    }

    const yesHandleHex = latestYes;
    const noHandleHex = latestNo;

    setIsUpdating(true);
    setError(null);

    try {
      const { RelayerWeb, SepoliaConfig } = await import("@zama-fhe/sdk");

      const relayer = new RelayerWeb({
        transports: {
          [SepoliaConfig.chainId]: {
            relayerUrl: SepoliaConfig.relayerUrl,
            aclContractAddress: SepoliaConfig.aclContractAddress,
            kmsContractAddress: SepoliaConfig.kmsContractAddress,
            inputVerifierContractAddress: SepoliaConfig.inputVerifierContractAddress,
            verifyingContractAddressDecryption: SepoliaConfig.verifyingContractAddressDecryption,
            verifyingContractAddressInputVerification: SepoliaConfig.verifyingContractAddressInputVerification,
            network: SepoliaConfig.network,
            gatewayChainId: SepoliaConfig.gatewayChainId,
          },
        },
        getChainId: async () => SepoliaConfig.chainId,
      });

      // Ask KMS to decrypt the publicly-decryptable pool handles
      const result = await relayer.publicDecrypt([yesHandleHex, noHandleHex]);

      const clearYes = result.clearValues[yesHandleHex] as bigint;
      const clearNo = result.clearValues[noHandleHex] as bigint;
      const proof = result.decryptionProof as `0x${string}`;

      // Submit on-chain with the KMS proof
      writeContract({
        ...config,
        functionName: "submitOddsUpdate",
        args: [clearYes, clearNo, proof],
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Odds update failed";
      setError(msg);
    } finally {
      setIsUpdating(false);
    }
  }, [yesHandle, noHandle, config, writeContract, refetchYes, refetchNo]);

  return {
    updateOdds,
    isUpdating: isUpdating || isWriting || isConfirming,
    isConfirmed,
    txHash,
    error,
  };
}
