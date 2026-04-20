/**
 * Singleton FHEVM relayer — lazy-initialized on first use.
 * Uses a regular require() to avoid Next.js chunk splitting issues
 * with the @zama-fhe/sdk WASM worker.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let relayer: any = null;
let initPromise: Promise<typeof relayer> | null = null;

async function init() {
  // Use Function constructor to bypass webpack's static analysis
  // so it doesn't try to split this into a separate chunk
  const importFn = new Function("specifier", "return import(specifier)");
  const sdk = await importFn("@zama-fhe/sdk");
  const { RelayerWeb, SepoliaConfig } = sdk;

  const instance = new RelayerWeb({
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

  return instance;
}

export async function getRelayer() {
  if (relayer) return relayer;
  if (!initPromise) {
    initPromise = init().catch((err) => {
      initPromise = null;
      throw err;
    });
  }
  relayer = await initPromise;
  return relayer;
}
