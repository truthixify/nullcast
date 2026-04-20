"use client";

import { useState, useCallback } from "react";
import { useAccount, useReadContract, useSignTypedData } from "wagmi";
import { getMarketConfig } from "@/lib/contracts";
import { getRelayer } from "@/lib/fhevm";
import { useNullCastStore } from "@/lib/store";

/**
 * Decrypt a user's encrypted position from the market contract.
 *
 * Flow:
 * 1. Read the encrypted handle from getUserYesPosition / getUserNoPosition
 * 2. Generate a keypair via the FHEVM SDK
 * 3. Create EIP-712 typed data and sign with the user's wallet
 * 4. Call relayer.userDecrypt with the signature + keypair
 * 5. KMS verifies ACL, decrypts, returns plaintext value
 */
export function useUserDecrypt(marketAddress: `0x${string}`) {
  const config = getMarketConfig(marketAddress);
  const { address: userAddress } = useAccount();
  const { signTypedDataAsync } = useSignTypedData();
  const setDecryptedValue = useNullCastStore((s) => s.setDecryptedValue);

  const [isDecrypting, setIsDecrypting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [yesAmount, setYesAmount] = useState<bigint | null>(null);
  const [noAmount, setNoAmount] = useState<bigint | null>(null);

  // Read encrypted handles from contract
  const { data: yesHandle } = useReadContract({
    ...config,
    functionName: "getUserYesPosition",
    args: userAddress ? [userAddress] : undefined,
    query: { enabled: !!userAddress },
  });

  const { data: noHandle } = useReadContract({
    ...config,
    functionName: "getUserNoPosition",
    args: userAddress ? [userAddress] : undefined,
    query: { enabled: !!userAddress },
  });

  const isZero = (h: unknown) => {
    if (!h) return true;
    return String(h).toLowerCase() === "0x" + "0".repeat(64);
  };

  const hasYesPosition = !isZero(yesHandle);
  const hasNoPosition = !isZero(noHandle);

  const decrypt = useCallback(async () => {
    if (!userAddress) {
      setError("Wallet not connected");
      return;
    }

    const handles: `0x${string}`[] = [];
    if (hasYesPosition) handles.push(yesHandle as `0x${string}`);
    if (hasNoPosition) handles.push(noHandle as `0x${string}`);

    if (handles.length === 0) {
      setError("No positions to decrypt");
      return;
    }

    setIsDecrypting(true);
    setError(null);

    try {
      const relayer = await getRelayer();

      // Step 1: Generate ephemeral keypair
      const keypair = await relayer.generateKeypair();

      // Step 2: Create EIP-712 typed data for authorization
      const startTimestamp = Math.floor(Date.now() / 1000);
      const durationDays = 1;
      const eip712 = await relayer.createEIP712(
        keypair.publicKey,
        [marketAddress],
        startTimestamp,
        durationDays
      );

      // Step 3: Sign with the user's wallet
      // Derive primaryType from types — it's the non-EIP712Domain key
      const primaryType =
        eip712.primaryType ||
        Object.keys(eip712.types).find((k) => k !== "EIP712Domain") ||
        "UserDecryptRequestVerification";

      const signature = await signTypedDataAsync({
        types: eip712.types as Record<string, Array<{ name: string; type: string }>>,
        primaryType,
        domain: eip712.domain as {
          name: string;
          version: string;
          chainId: number;
          verifyingContract: `0x${string}`;
        },
        message: eip712.message as Record<string, unknown>,
      });

      // Step 4: Decrypt via KMS
      const result = await relayer.userDecrypt({
        handles,
        contractAddress: marketAddress,
        signedContractAddresses: [marketAddress],
        privateKey: keypair.privateKey,
        publicKey: keypair.publicKey,
        signature,
        signerAddress: userAddress,
        startTimestamp,
        durationDays,
      });

      // Step 5: Extract values
      if (hasYesPosition) {
        const val = result[yesHandle as `0x${string}`] as bigint;
        setYesAmount(val);
        setDecryptedValue(`${marketAddress}-yes`, String(val));
      }
      if (hasNoPosition) {
        const val = result[noHandle as `0x${string}`] as bigint;
        setNoAmount(val);
        setDecryptedValue(`${marketAddress}-no`, String(val));
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Decryption failed";
      setError(msg);
    } finally {
      setIsDecrypting(false);
    }
  }, [
    userAddress, marketAddress, hasYesPosition, hasNoPosition,
    yesHandle, noHandle, signTypedDataAsync, setDecryptedValue,
  ]);

  // Check localStorage for previously decrypted values
  const cachedYes = useNullCastStore((s) => s.decryptedValues[`${marketAddress}-yes`]);
  const cachedNo = useNullCastStore((s) => s.decryptedValues[`${marketAddress}-no`]);
  const invalidate = useNullCastStore((s) => s.invalidateDecryptedValues);

  const refresh = useCallback(async () => {
    // Clear cache so decrypt fetches fresh values from KMS
    invalidate(marketAddress);
    setYesAmount(null);
    setNoAmount(null);
    await decrypt();
  }, [invalidate, marketAddress, decrypt]);

  return {
    decrypt,
    refresh,
    isDecrypting,
    error,
    hasYesPosition,
    hasNoPosition,
    yesAmount: yesAmount ?? (cachedYes ? BigInt(cachedYes) : null),
    noAmount: noAmount ?? (cachedNo ? BigInt(cachedNo) : null),
    isDecrypted: yesAmount !== null || noAmount !== null || !!cachedYes || !!cachedNo,
    isCached: !!(cachedYes || cachedNo) && yesAmount === null && noAmount === null,
  };
}
