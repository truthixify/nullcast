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

  const { data: yesHandle } = useReadContract({
    ...config,
    functionName: "getTotalYesPoolHandle",
  });

  const { data: noHandle } = useReadContract({
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

  const ZERO_HANDLE = "0x0000000000000000000000000000000000000000000000000000000000000000";

  const updateOdds = useCallback(async () => {
    if (!yesHandle || !noHandle) {
      setError("Pool handles not available yet");
      return;
    }

    const yesHandleHex = yesHandle as `0x${string}`;
    const noHandleHex = noHandle as `0x${string}`;

    // No bets placed yet — pools are uninitialized (zero handles)
    if (yesHandleHex === ZERO_HANDLE && noHandleHex === ZERO_HANDLE) {
      setError("No bets placed yet — pools are empty");
      return;
    }

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
  }, [yesHandle, noHandle, config, writeContract]);

  return {
    updateOdds,
    isUpdating: isUpdating || isWriting || isConfirming,
    isConfirmed,
    txHash,
    error,
  };
}
