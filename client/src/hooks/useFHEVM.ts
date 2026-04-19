"use client";

import { useState, useCallback, useRef } from "react";
import { useAccount } from "wagmi";
import { toHex } from "viem";

type RelayerType = Awaited<ReturnType<typeof createRelayer>>;
let relayerInstance: RelayerType | null = null;

async function createRelayer() {
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

  return relayer;
}

async function getRelayer() {
  if (relayerInstance) return relayerInstance;
  relayerInstance = await createRelayer();
  return relayerInstance;
}

export function useFHEEncrypt() {
  const { address } = useAccount();
  const [isEncrypting, setIsEncrypting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef(false);

  const encrypt = useCallback(
    async (
      amount: bigint,
      contractAddress: `0x${string}`
    ): Promise<{ handle: `0x${string}`; inputProof: `0x${string}` } | null> => {
      if (!address) {
        setError("Wallet not connected");
        return null;
      }

      setIsEncrypting(true);
      setError(null);
      abortRef.current = false;

      try {
        const relayer = await getRelayer();

        const result = await relayer.encrypt({
          values: [{ value: amount, type: "euint64" }],
          contractAddress,
          userAddress: address,
        });

        if (abortRef.current) return null;

        const handle = toHex(result.handles[0]);
        const inputProof = toHex(result.inputProof);

        return { handle, inputProof };
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Encryption failed";
        setError(msg);
        return null;
      } finally {
        setIsEncrypting(false);
      }
    },
    [address]
  );

  const reset = useCallback(() => {
    abortRef.current = true;
    setIsEncrypting(false);
    setError(null);
  }, []);

  return { encrypt, isEncrypting, error, reset };
}
