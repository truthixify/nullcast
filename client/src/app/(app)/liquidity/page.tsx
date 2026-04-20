"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useAccount, useReadContract } from "wagmi";
import { useFactoryMarkets } from "@/hooks/useFactory";
import { useMarket } from "@/hooks/useMarket";
import {
  useLiquidityPool,
  useIsLP,
  useAddLiquidity,
  useWithdrawLiquidity,
  useClaimLPFees,
} from "@/hooks/useLiquidity";
import { useApproveCUSDT } from "@/hooks/useCUSDT";
import { useFHEEncrypt } from "@/hooks/useFHEVM";
import { useSignTypedData } from "wagmi";
import { getRelayer } from "@/lib/fhevm";
import { nullCastFactoryConfig } from "@/lib/contracts";
import { CONTRACT_ADDRESSES } from "@/constants/addresses";
import LiquidityPoolABI from "@/constants/abis/LiquidityPool.json";
import { GlowCard } from "@/components/shared/GlowCard";
import { CipherReveal } from "@/components/shared/CipherReveal";

/* ── Deposit flow step type ──────────────────────────────────── */

type DepositStep =
  | "idle"
  | "encrypting"
  | "approving"
  | "writing"
  | "confirming"
  | "confirmed"
  | "error";

function fmtUSD(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
  return v.toFixed(2);
}

/* ── MarketLPCard — per-market liquidity card ────────────────── */

function MarketLPCard({
  marketAddress,
  marketIndex,
}: {
  marketAddress: `0x${string}`;
  marketIndex: number;
}) {
  const { address: userAddress } = useAccount();
  const { question, isLoading: isMarketLoading } = useMarket(marketAddress);

  /* ── Read pool address from factory ────────────────────────── */
  const { data: poolAddressRaw, isLoading: isPoolAddrLoading } = useReadContract({
    ...nullCastFactoryConfig,
    functionName: "getLiquidityPool",
    args: [BigInt(marketIndex)],
  });

  const poolAddress = poolAddressRaw as `0x${string}` | undefined;
  const isZeroPool =
    !poolAddress || poolAddress === "0x0000000000000000000000000000000000000000";

  /* ── Pool stats ────────────────────────────────────────────── */
  const zeroAddr = "0x0000000000000000000000000000000000000000" as `0x${string}`;
  const { totalLiquidity } = useLiquidityPool(
    isZeroPool ? zeroAddr : poolAddress
  );

  /* ── Is user an LP? ────────────────────────────────────────── */
  const { isLP } = useIsLP(
    isZeroPool ? zeroAddr : poolAddress,
    userAddress
  );

  /* ── Write hooks ───────────────────────────────────────────── */
  const addLiq = useAddLiquidity(isZeroPool ? zeroAddr : poolAddress);
  const withdrawLiq = useWithdrawLiquidity(isZeroPool ? zeroAddr : poolAddress);
  const claimFees = useClaimLPFees(isZeroPool ? zeroAddr : poolAddress);
  const approveCUSDT = useApproveCUSDT();
  const fhe = useFHEEncrypt();

  /* ── LP share decrypt ──────────────────────────────────────── */
  const { signTypedDataAsync } = useSignTypedData();
  const [shareDecrypted, setShareDecrypted] = useState<string | null>(null);
  const [isDecrypting, setIsDecrypting] = useState(false);

  // Read LP share handle
  const { data: shareHandle } = useReadContract({
    address: isZeroPool ? zeroAddr : poolAddress,
    abi: LiquidityPoolABI,
    functionName: "getLPShares",
    args: userAddress ? [userAddress] : undefined,
    query: { enabled: !!userAddress && isLP === true },
  });

  const handleDecryptShare = useCallback(async () => {
    if (!userAddress || !poolAddress || !shareHandle) return;
    const handleHex = shareHandle as `0x${string}`;
    if (handleHex === zeroAddr + "0".repeat(24)) return;

    setIsDecrypting(true);
    try {
      const relayer = await getRelayer();
      const keypair = await relayer.generateKeypair();
      const startTimestamp = Math.floor(Date.now() / 1000);
      const eip712 = await relayer.createEIP712(keypair.publicKey, [poolAddress], startTimestamp, 1);
      const primaryType = eip712.primaryType || Object.keys(eip712.types).find((k: string) => k !== "EIP712Domain") || "UserDecryptRequestVerification";

      const signature = await signTypedDataAsync({
        types: eip712.types as Record<string, Array<{ name: string; type: string }>>,
        primaryType,
        domain: eip712.domain as { name: string; version: string; chainId: number; verifyingContract: `0x${string}` },
        message: eip712.message as Record<string, unknown>,
      });

      const result = await relayer.userDecrypt({
        handles: [handleHex],
        contractAddress: poolAddress,
        signedContractAddresses: [poolAddress],
        privateKey: keypair.privateKey,
        publicKey: keypair.publicKey,
        signature,
        signerAddress: userAddress,
        startTimestamp,
        durationDays: 1,
      });

      const val = result[handleHex] as bigint;
      setShareDecrypted((Number(val) / 1e6).toFixed(2));
    } catch {
      // User rejected or KMS error
    } finally {
      setIsDecrypting(false);
    }
  }, [userAddress, poolAddress, shareHandle, signTypedDataAsync]);

  /* ── Local state ───────────────────────────────────────────── */
  const [amount, setAmount] = useState("100");
  const [depositStep, setDepositStep] = useState<DepositStep>("idle");
  const [showDepositForm, setShowDepositForm] = useState(false);
  const amountNum = parseFloat(amount) || 0;

  /* ── Track confirmation for deposit ────────────────────────── */
  const prevConfirmed = useRef(false);
  useEffect(() => {
    if (addLiq.isConfirmed && !prevConfirmed.current && depositStep === "confirming") {
      prevConfirmed.current = true;
      setDepositStep("confirmed");
    }
    if (!addLiq.isConfirmed) {
      prevConfirmed.current = false;
    }
  }, [addLiq.isConfirmed, depositStep]);

  /* ── Deposit handler ───────────────────────────────────────── */
  const handleDeposit = useCallback(async () => {
    if (!userAddress || isZeroPool || !poolAddress || amountNum <= 0) return;

    try {
      setDepositStep("encrypting");
      const amountBaseUnits = BigInt(Math.round(amountNum * 1e6));

      const encResult = await fhe.encrypt(amountBaseUnits, poolAddress);
      if (!encResult) {
        setDepositStep("error");
        return;
      }

      setDepositStep("approving");
      const approveEnc = await fhe.encrypt(
        amountBaseUnits,
        CONTRACT_ADDRESSES.MockcUSDT as `0x${string}`
      );
      if (!approveEnc) {
        setDepositStep("error");
        return;
      }
      approveCUSDT.approve(poolAddress, approveEnc.handle, approveEnc.inputProof);

      setDepositStep("writing");
      addLiq.addLiquidity(encResult.handle, encResult.inputProof);
      setDepositStep("confirming");
    } catch {
      setDepositStep("error");
    }
  }, [userAddress, isZeroPool, poolAddress, amountNum, fhe, approveCUSDT, addLiq]);

  /* ── Loading skeleton ──────────────────────────────────────── */
  if (isMarketLoading || isPoolAddrLoading) {
    return (
      <GlowCard style={{ padding: 22 }}>
        <div style={{ width: "60%", height: 16, marginBottom: 16, background: "var(--bg-2)", borderRadius: 3 }} />
        <div style={{ width: "40%", height: 14, marginBottom: 16, background: "var(--bg-2)", borderRadius: 3 }} />
        <div style={{ width: "100%", height: 36, background: "var(--bg-2)", borderRadius: 3 }} />
      </GlowCard>
    );
  }

  /* ── No pool deployed ──────────────────────────────────────── */
  if (isZeroPool) {
    return (
      <GlowCard style={{ padding: 22 }}>
        <div className="serif" style={{ fontSize: 17, fontWeight: 500, letterSpacing: "-0.005em", lineHeight: 1.3, marginBottom: 18, color: "var(--ink-1)" }}>
          {question ?? "Unknown market"}
        </div>
        <div style={{ textAlign: "center", color: "var(--ink-4)", fontSize: 13, padding: "16px 0" }}>
          No liquidity pool deployed for this market.
        </div>
      </GlowCard>
    );
  }


  return (
    <GlowCard style={{ padding: 22 }}>
      {/* Market question */}
      <div
        className="serif"
        style={{
          fontSize: 17,
          fontWeight: 500,
          letterSpacing: "-0.005em",
          lineHeight: 1.3,
          marginBottom: 18,
          color: "var(--ink-1)",
          cursor: "pointer",
        }}
      >
        {question ?? "Unknown market"}
      </div>

      {/* 2-col stats */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 9, color: "var(--ink-4)", letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: 6 }}>
            Your share
          </div>
          <div className="mono" style={{ fontSize: 20, color: isLP ? "var(--ink-1)" : "var(--ink-3)", letterSpacing: "-0.01em" }}>
            {isLP ? (
              shareDecrypted ? (
                <>
                  <CipherReveal value={shareDecrypted} reveal={true} width={7} />
                  <span style={{ color: "var(--ink-3)", fontSize: 11, marginLeft: 6 }}>cUSDT</span>
                </>
              ) : (
                <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 14, letterSpacing: "0.1em", color: "var(--ink-3)" }}>••••••</span>
                  <button
                    onClick={handleDecryptShare}
                    disabled={isDecrypting}
                    style={{
                      fontSize: 11,
                      padding: "4px 10px",
                      border: "1px solid var(--gold-dim)",
                      borderRadius: 3,
                      color: "var(--gold)",
                      cursor: "pointer",
                      background: "transparent",
                    }}
                  >
                    {isDecrypting ? "Decrypting..." : "Decrypt"}
                  </button>
                </span>
              )
            ) : (
              <span style={{ fontSize: 14 }}>&mdash;</span>
            )}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 9, color: "var(--ink-4)", letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: 6 }}>
            Pool TVL
          </div>
          <div className="mono" style={{ fontSize: 20, color: "var(--ink-1)", letterSpacing: "-0.01em" }}>
            {fmtUSD(totalLiquidity)}
          </div>
        </div>
      </div>

      {/* Buttons or deposit form */}
      {!showDepositForm ? (
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => setShowDepositForm(true)}
            style={{
              flex: 1,
              padding: "9px 0",
              fontSize: 12,
              background: "var(--gold)",
              color: "#1A1511",
              borderRadius: 3,
              fontWeight: 500,
              border: "none",
              cursor: "pointer",
            }}
          >
            Deposit
          </button>
          <button
            disabled={!isLP}
            onClick={() => { if (isLP) withdrawLiq.withdrawLiquidity(); }}
            style={{
              flex: 1,
              padding: "9px 0",
              fontSize: 12,
              border: "1px solid var(--line-2)",
              borderRadius: 3,
              color: !isLP ? "var(--ink-4)" : "var(--ink-2)",
              opacity: !isLP ? 0.5 : 1,
              background: "transparent",
              cursor: isLP ? "pointer" : "default",
            }}
          >
            {withdrawLiq.isWriting ? "Confirm..." : withdrawLiq.isConfirming ? "Withdrawing..." : withdrawLiq.isConfirmed ? "Withdrawn" : "Withdraw"}
          </button>
        </div>
      ) : (
        <div>
          <div style={{ marginBottom: 10 }}>
            <label className="mono" style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--ink-3)", display: "block", marginBottom: 6 }}>
              Deposit amount
            </label>
            <div style={{ display: "flex", border: "1px solid var(--line-2)", borderRadius: 3, overflow: "hidden" }}>
              <input
                type="text"
                placeholder="0.00"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  if (depositStep !== "idle") setDepositStep("idle");
                }}
                className="mono"
                style={{
                  flex: 1,
                  padding: "8px 12px",
                  fontSize: 14,
                  background: "transparent",
                  border: "none",
                  color: "var(--ink-1)",
                  outline: "none",
                }}
              />
              <span className="mono" style={{ padding: "8px 12px", fontSize: 11, color: "var(--ink-3)", display: "flex", alignItems: "center" }}>
                cUSDT
              </span>
            </div>
          </div>

          <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
            {[50, 100, 250, 500].map((qa) => (
              <button
                key={qa}
                className="mono"
                onClick={() => {
                  setAmount(String(qa));
                  if (depositStep !== "idle") setDepositStep("idle");
                }}
                style={{
                  flex: 1,
                  padding: "6px 0",
                  fontSize: 11,
                  border: `1px solid ${amount === String(qa) ? "var(--gold-dim)" : "var(--line)"}`,
                  borderRadius: 3,
                  color: amount === String(qa) ? "var(--gold)" : "var(--ink-3)",
                  background: "transparent",
                  cursor: "pointer",
                }}
              >
                {qa}
              </button>
            ))}
          </div>

          <button
            onClick={handleDeposit}
            disabled={
              !userAddress ||
              depositStep !== "idle" ||
              amountNum <= 0 ||
              addLiq.isWriting ||
              addLiq.isConfirming
            }
            style={{
              width: "100%",
              padding: "9px 0",
              fontSize: 12,
              background: "var(--gold)",
              color: "#1A1511",
              borderRadius: 3,
              fontWeight: 500,
              border: "none",
              cursor: "pointer",
              opacity: (!userAddress || depositStep !== "idle" || amountNum <= 0) ? 0.5 : 1,
            }}
          >
            {!userAddress
              ? "Connect wallet"
              : depositStep === "encrypting"
                ? "Encrypting..."
                : depositStep === "approving"
                  ? "Approving cUSDT..."
                  : depositStep === "writing" || addLiq.isWriting
                    ? "Confirm in wallet..."
                    : addLiq.isConfirming
                      ? "Confirming..."
                      : depositStep === "confirmed"
                        ? "Deposited"
                        : `Deposit ${amountNum > 0 ? `${amountNum} cUSDT` : ""}`}
          </button>

          {depositStep === "error" && (
            <div style={{ marginTop: 10, padding: "8px 12px", fontSize: 12, color: "var(--no)", border: "1px solid var(--line)", borderRadius: 3 }}>
              <p style={{ marginBottom: 6 }}>{fhe.error || addLiq.error?.message || "Something went wrong"}</p>
              <button
                onClick={() => { setDepositStep("idle"); fhe.reset(); }}
                style={{ fontSize: 11, color: "var(--ink-2)", background: "transparent", border: "1px solid var(--line)", borderRadius: 3, padding: "4px 10px", cursor: "pointer" }}
              >
                Retry
              </button>
            </div>
          )}
        </div>
      )}

      {/* Claim fees for LPs */}
      {isLP && !showDepositForm && (
        <button
          onClick={() => claimFees.claimFees()}
          disabled={claimFees.isWriting || claimFees.isConfirming}
          className="mono"
          style={{
            width: "100%",
            marginTop: 8,
            padding: "7px 0",
            fontSize: 11,
            border: "1px solid var(--line)",
            borderRadius: 3,
            color: "var(--ink-3)",
            background: "transparent",
            cursor: "pointer",
          }}
        >
          {claimFees.isWriting ? "Confirm..." : claimFees.isConfirming ? "Claiming..." : claimFees.isConfirmed ? "Fees claimed" : "Claim fees"}
        </button>
      )}
    </GlowCard>
  );
}

/* ── Liquidity page ──────────────────────────────────────────── */

export default function LiquidityPage() {
  const { allMarkets, isLoading } = useFactoryMarkets();
  const [syncing, setSyncing] = useState(false);

  const handleSync = async () => {
    setSyncing(true);
    try { await fetch("/api/keeper"); } catch { /* ignore */ }
    setSyncing(false);
  };

  return (
    <div className="page-in" style={{ maxWidth: 1280, margin: "0 auto", padding: "44px 48px 80px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 36 }}>
        <h1 className="serif" style={{ fontSize: 38, fontWeight: 500, letterSpacing: "-0.02em" }}>
          Liquidity
        </h1>
        <button
          onClick={handleSync}
          disabled={syncing}
          style={{
            fontSize: 11,
            padding: "7px 12px",
            border: "1px solid var(--line)",
            borderRadius: 3,
            color: syncing ? "var(--ink-4)" : "var(--ink-3)",
            cursor: syncing ? "default" : "pointer",
            background: "transparent",
          }}
        >
          {syncing ? "Syncing..." : "Sync totals"}
        </button>
      </div>

      {/* Loading */}
      {isLoading && (
        <div style={{ textAlign: "center", padding: "60px 20px", color: "var(--ink-3)", fontSize: 13 }}>
          Loading markets...
        </div>
      )}

      {/* LP cards grid */}
      {!isLoading && allMarkets.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(420px, 1fr))", gap: 12 }}>
          {allMarkets.map((addr, i) => (
            <MarketLPCard
              key={addr}
              marketAddress={addr}
              marketIndex={i}
            />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && allMarkets.length === 0 && (
        <div style={{ padding: "80px 20px", textAlign: "center", color: "var(--ink-3)", fontSize: 13 }}>
          No markets available. Markets will appear here once they are created.
        </div>
      )}
    </div>
  );
}
