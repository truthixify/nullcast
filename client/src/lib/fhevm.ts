/**
 * Singleton FHEVM relayer — lazy-initialized on first use.
 */

import { RelayerWeb, SepoliaConfig } from "@zama-fhe/sdk";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let relayer: InstanceType<typeof RelayerWeb> | null = null;

function createRelayer() {
  return new RelayerWeb({
    transports: {
      [SepoliaConfig.chainId]: {
        relayerUrl: SepoliaConfig.relayerUrl,
        aclContractAddress: SepoliaConfig.aclContractAddress,
        kmsContractAddress: SepoliaConfig.kmsContractAddress,
        inputVerifierContractAddress:
          SepoliaConfig.inputVerifierContractAddress,
        verifyingContractAddressDecryption:
          SepoliaConfig.verifyingContractAddressDecryption,
        verifyingContractAddressInputVerification:
          SepoliaConfig.verifyingContractAddressInputVerification,
        network: SepoliaConfig.network,
        gatewayChainId: SepoliaConfig.gatewayChainId,
      },
    },
    getChainId: async () => SepoliaConfig.chainId,
  });
}

export async function getRelayer() {
  if (!relayer) {
    relayer = createRelayer();
  }
  return relayer;
}
