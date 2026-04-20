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
import { nullCastFactoryConfig } from "@/lib/contracts";
import { CONTRACT_ADDRESSES } from "@/constants/addresses";
import { LockIcon, CheckIcon } from "@/components/shared/Icons";

/* ── Status helpers ──────────────────────────────────────────── */

const STATUS_LABELS: Record<number, string> = {
  0: "Open",
  1: "Expired",
  2: "Resolving",
  3: "Resolved",
  4: "Cancelled",
};

const STATUS_PILL_CLASS: Record<number, string> = {
  0: "pill open",
  1: "pill expired",
  2: "pill expired",
  3: "pill resolved",
  4: "pill cancelled",
};

/* ── Deposit flow step type ──────────────────────────────────── */

type DepositStep =
  | "idle"
  | "encrypting"
  | "approving"
  | "writing"
  | "confirming"
  | "confirmed"
  | "error";


/* ── MarketLPCard — per-market liquidity card ────────────────── */

function MarketLPCard({
  marketAddress,
  marketIndex,
}: {
  marketAddress: `0x${string}`;
  marketIndex: number;
}) {
  const { address: userAddress } = useAccount();
  const { question, status, isLoading: isMarketLoading } = useMarket(marketAddress);

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
  const { lpCount } = useLiquidityPool(
    isZeroPool
      ? ("0x0000000000000000000000000000000000000000" as `0x${string}`)
      : poolAddress
  );

  /* ── Is user an LP? ────────────────────────────────────────── */
  const { isLP } = useIsLP(
    isZeroPool
      ? ("0x0000000000000000000000000000000000000000" as `0x${string}`)
      : poolAddress,
    userAddress
  );

  /* ── Write hooks ───────────────────────────────────────────── */
  const addLiq = useAddLiquidity(
    isZeroPool
      ? ("0x0000000000000000000000000000000000000000" as `0x${string}`)
      : poolAddress
  );
  const withdrawLiq = useWithdrawLiquidity(
    isZeroPool
      ? ("0x0000000000000000000000000000000000000000" as `0x${string}`)
      : poolAddress
  );
  const claimFees = useClaimLPFees(
    isZeroPool
      ? ("0x0000000000000000000000000000000000000000" as `0x${string}`)
      : poolAddress
  );
  const approveCUSDT = useApproveCUSDT();
  const fhe = useFHEEncrypt();

  /* ── Local state ───────────────────────────────────────────── */
  const [amount, setAmount] = useState("100");
  const [depositStep, setDepositStep] = useState<DepositStep>("idle");

  const amountNum = parseFloat(amount) || 0;
  const statusNum = typeof status === "number" ? status : 0;

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

      /* Encrypt amount for the pool contract */
      const encResult = await fhe.encrypt(amountBaseUnits, poolAddress);
      if (!encResult) {
        setDepositStep("error");
        return;
      }

      /* Approve cUSDT spend */
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

      /* Call addLiquidity */
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
      <div className="card" style={{ padding: 0 }}>
        <div className="card-head">
          <div className="skel" style={{ width: "60%", height: 14 }} />
          <div className="skel" style={{ width: 50, height: 20 }} />
        </div>
        <div className="card-body">
          <div className="skel" style={{ width: "40%", height: 13, marginBottom: 16 }} />
          <div className="skel" style={{ width: "100%", height: 36 }} />
        </div>
      </div>
    );
  }

  /* ── No pool deployed ──────────────────────────────────────── */
  if (isZeroPool) {
    return (
      <div className="card" style={{ padding: 0 }}>
        <div className="card-head">
          <h3 style={{ flex: 1 }}>{question ?? "Unknown market"}</h3>
          <span className={STATUS_PILL_CLASS[statusNum] ?? "pill"}>
            {STATUS_LABELS[statusNum] ?? "Unknown"}
          </span>
        </div>
        <div
          className="card-body"
          style={{
            padding: "32px 16px",
            textAlign: "center",
            color: "var(--t-4)",
            fontSize: 13,
          }}
        >
          No liquidity pool deployed for this market.
        </div>
      </div>
    );
  }

  /* ── Rendered card ─────────────────────────────────────────── */
  return (
    <div className="card" style={{ padding: 0 }}>
      {/* Header */}
      <div className="card-head">
        <h3 style={{ flex: 1 }}>{question ?? "Unknown market"}</h3>
        <span className={STATUS_PILL_CLASS[statusNum] ?? "pill"}>
          {STATUS_LABELS[statusNum] ?? "Unknown"}
        </span>
      </div>

      <div className="card-body">
        {/* Pool stats row */}
        <div
          className="row between"
          style={{ marginBottom: 16, fontSize: 13, color: "var(--t-2)" }}
        >
          <span className="mono">
            {lpCount} LP{lpCount !== 1 ? "s" : ""}
          </span>
          <span className="mono" style={{ fontSize: 11, color: "var(--t-4)" }}>
            Pool: {poolAddress.slice(0, 6)}...{poolAddress.slice(-4)}
          </span>
        </div>

        {/* ── LP actions (withdraw + claim) ──────────────────── */}
        {isLP && (
          <div style={{ marginBottom: 16 }}>
            <div
              className="row"
              style={{
                gap: 8,
                marginBottom: 12,
                padding: "8px 12px",
                background: "var(--yes-bg)",
                border: "1px solid var(--yes-bd)",
                borderRadius: 8,
              }}
            >
              <CheckIcon size={12} />
              <span style={{ fontSize: 12, color: "var(--yes-hi)", fontWeight: 500 }}>
                You are an LP
              </span>
              <span
                className="mono"
                style={{
                  marginLeft: "auto",
                  fontSize: 11,
                  color: "var(--t-3)",
                }}
              >
                Share: encrypted
              </span>
            </div>

            <div className="row" style={{ gap: 8 }}>
              <button
                className="btn secondary"
                type="button"
                onClick={() => withdrawLiq.withdrawLiquidity()}
                disabled={withdrawLiq.isWriting || withdrawLiq.isConfirming}
                style={{ flex: 1 }}
              >
                {withdrawLiq.isWriting
                  ? "Confirm in wallet..."
                  : withdrawLiq.isConfirming
                    ? "Confirming..."
                    : withdrawLiq.isConfirmed
                      ? "Withdrawn"
                      : "Withdraw"}
              </button>
              <button
                className="btn secondary"
                type="button"
                onClick={() => claimFees.claimFees()}
                disabled={claimFees.isWriting || claimFees.isConfirming}
                style={{ flex: 1 }}
              >
                {claimFees.isWriting
                  ? "Confirm in wallet..."
                  : claimFees.isConfirming
                    ? "Confirming..."
                    : claimFees.isConfirmed
                      ? "Claimed"
                      : "Claim fees"}
              </button>
            </div>

            {/* Withdraw/claim errors */}
            {withdrawLiq.error && (
              <p
                className="mono"
                style={{
                  fontSize: 11,
                  color: "var(--no)",
                  marginTop: 8,
                  wordBreak: "break-all",
                }}
              >
                {withdrawLiq.error.message}
              </p>
            )}
            {claimFees.error && (
              <p
                className="mono"
                style={{
                  fontSize: 11,
                  color: "var(--no)",
                  marginTop: 8,
                  wordBreak: "break-all",
                }}
              >
                {claimFees.error.message}
              </p>
            )}
          </div>
        )}

        {/* ── Deposit form (non-LP or LP wanting to add more) ── */}
        <div>
          <div className="field" style={{ marginBottom: 10 }}>
            <label className="eyebrow">Deposit amount</label>
            <div className="input-row">
              <input
                className="input input-mono"
                type="text"
                placeholder="0.00"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  if (depositStep !== "idle") setDepositStep("idle");
                }}
              />
              <span className="unit">cUSDT</span>
            </div>
          </div>

          {/* Quick amount buttons */}
          <div className="row gap-2" style={{ marginBottom: 12 }}>
            {[50, 100, 250, 500].map((qa) => (
              <button
                key={qa}
                className={`btn sm ${amount === String(qa) ? "primary" : "ghost"}`}
                type="button"
                onClick={() => {
                  setAmount(String(qa));
                  if (depositStep !== "idle") setDepositStep("idle");
                }}
                style={{ flex: 1, justifyContent: "center" }}
              >
                {qa}
              </button>
            ))}
          </div>

          {/* Deposit button */}
          <button
            className="btn primary block"
            type="button"
            onClick={handleDeposit}
            disabled={
              !userAddress ||
              depositStep !== "idle" ||
              amountNum <= 0 ||
              addLiq.isWriting ||
              addLiq.isConfirming
            }
          >
            {!userAddress
              ? "Connect wallet to deposit"
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

          {/* Error state */}
          {depositStep === "error" && (
            <div
              style={{
                background: "var(--no-bg)",
                border: "1px solid var(--no-bd)",
                borderRadius: 8,
                padding: "10px 14px",
                marginTop: 10,
                fontSize: 12,
              }}
            >
              <p style={{ color: "var(--no)", fontWeight: 500, marginBottom: 6 }}>
                {fhe.error || addLiq.error?.message || "Something went wrong"}
              </p>
              <button
                className="btn sm ghost"
                type="button"
                onClick={() => {
                  setDepositStep("idle");
                  fhe.reset();
                }}
              >
                Retry
              </button>
            </div>
          )}

          {addLiq.error && depositStep !== "error" && (
            <p
              className="mono"
              style={{
                fontSize: 11,
                color: "var(--no)",
                marginTop: 8,
                wordBreak: "break-all",
              }}
            >
              {addLiq.error.message}
            </p>
          )}
        </div>

        {/* Privacy notice */}
        <div
          style={{
            background: "var(--enc-bg)",
            border: "1px solid var(--enc-bd)",
            borderRadius: 8,
            padding: "10px 14px",
            marginTop: 14,
            display: "flex",
            alignItems: "flex-start",
            gap: 8,
          }}
        >
          <LockIcon size={11} />
          <div style={{ fontSize: 11, color: "var(--enc)", lineHeight: 1.5 }}>
            <strong>LP shares are encrypted</strong>
            <br />
            Your deposit amount is private. Only aggregate liquidity is public.
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Liquidity page ──────────────────────────────────────────── */

export default function LiquidityPage() {
  const { allMarkets, isLoading } = useFactoryMarkets();

  return (
    <div className="page">
      <div className="container">
        {/* Page head */}
        <div className="page-head" style={{ padding: 0, marginBottom: 24 }}>
          <h1 style={{ fontSize: 36 }}>Liquidity</h1>
          <p className="sub">
            Provide liquidity to prediction markets and earn fees from trading
            activity.
          </p>
        </div>

        {/* Loading */}
        {isLoading && (
          <div
            className="row"
            style={{
              justifyContent: "center",
              padding: "60px 20px",
              gap: 12,
            }}
          >
            <span
              style={{
                width: 16,
                height: 16,
                borderRadius: "50%",
                border: "2px solid var(--acc)",
                borderTopColor: "transparent",
                animation: "spin 1s linear infinite",
              }}
            />
            <span style={{ fontSize: 13, color: "var(--t-2)" }}>
              Loading markets...
            </span>
          </div>
        )}

        {/* Market LP cards */}
        {!isLoading && allMarkets.length > 0 && (
          <div className="stack gap-4">
            <div className="row between">
              <span className="eyebrow">
                {allMarkets.length} market{allMarkets.length !== 1 ? "s" : ""}
              </span>
            </div>
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
          <div
            className="card elevated"
            style={{
              padding: "80px 20px",
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 12,
            }}
          >
            <CheckIcon size={24} />
            <span
              style={{
                fontSize: 14,
                fontWeight: 500,
                color: "var(--t-2)",
              }}
            >
              No markets available
            </span>
            <span
              style={{
                fontSize: 12,
                color: "var(--t-3)",
                maxWidth: 320,
              }}
            >
              Markets will appear here once they are created.
            </span>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
