"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import { useAccount, useReadContract, useReadContracts, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { vaultFactoryConfig, getVaultConfig } from "@/lib/contracts";
import { useApproveCUSDT } from "@/hooks/useCUSDT";
import { useFHEEncrypt } from "@/hooks/useFHEVM";
import { CONTRACT_ADDRESSES } from "@/constants/addresses";
import { Icon } from "@/components/shared/Icons";
import { GlowCard } from "@/components/shared/GlowCard";

/* ── Deposit flow step type ──────────────────────────────────── */

type DepositStep =
  | "idle"
  | "encrypting"
  | "approving"
  | "writing"
  | "confirming"
  | "confirmed"
  | "error";

/* ── Helpers ─────────────────────────────────────────────────── */

function truncAddr(addr: string): string {
  if (addr.length <= 10) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function fmtUSD(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
  return v.toFixed(2);
}

/* ── VaultCard ───────────────────────────────────────────────── */

function VaultCard({ address }: { address: `0x${string}` }) {
  const config = getVaultConfig(address);
  const { address: userAddress } = useAccount();

  const { data, isLoading } = useReadContracts({
    contracts: [
      { ...config, functionName: "name" },
      { ...config, functionName: "description" },
      { ...config, functionName: "manager" },
      { ...config, functionName: "followerCount" },
      { ...config, functionName: "requiredTier" },
      { ...config, functionName: "performanceFeeBps" },
      { ...config, functionName: "publicTotalDeposits" },
      { ...config, functionName: "closed" },
      { ...config, functionName: "vaultId" },
    ],
  });

  const name = data?.[0]?.result as string | undefined;
  const manager = data?.[2]?.result as string | undefined;
  const followerCount = data?.[3]?.result as bigint | undefined;
  const perfFeeBps = data?.[5]?.result as number | undefined;
  const publicTotalDeposits = data?.[6]?.result as bigint | undefined;
  const closed = data?.[7]?.result as boolean | undefined;

  const isManager = userAddress && manager && userAddress.toLowerCase() === manager.toLowerCase();

  /* ── Close vault ───────────────────────────────────────────── */
  const {
    writeContract: writeClose,
    data: closeHash,
    isPending: isClosing,
  } = useWriteContract();
  const { isLoading: isCloseConfirming, isSuccess: isCloseClosed } =
    useWaitForTransactionReceipt({ hash: closeHash });

  const handleClose = () => {
    writeClose({
      ...config,
      functionName: "closeVault",
    });
  };

  /* ── Deposit ───────────────────────────────────────────────── */
  const {
    writeContract: writeDeposit,
    data: depositHash,
    isPending: isDepositWriting,
    error: depositWriteError,
  } = useWriteContract();
  const {
    isLoading: isDepositConfirming,
    isSuccess: isDepositConfirmed,
  } = useWaitForTransactionReceipt({ hash: depositHash });

  const approveCUSDT = useApproveCUSDT();
  const fhe = useFHEEncrypt();

  const [amount, setAmount] = useState("100");
  const [depositStep, setDepositStep] = useState<DepositStep>("idle");
  const [showDeposit, setShowDeposit] = useState(false);
  const amountNum = parseFloat(amount) || 0;

  const prevConfirmed = useRef(false);
  useEffect(() => {
    if (isDepositConfirmed && !prevConfirmed.current && depositStep === "confirming") {
      prevConfirmed.current = true;
      setDepositStep("confirmed");
    }
    if (!isDepositConfirmed) {
      prevConfirmed.current = false;
    }
  }, [isDepositConfirmed, depositStep]);

  const handleDeposit = useCallback(async () => {
    if (!userAddress || amountNum <= 0) return;

    try {
      setDepositStep("encrypting");
      const amountBaseUnits = BigInt(Math.round(amountNum * 1e6));

      const encResult = await fhe.encrypt(amountBaseUnits, address);
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
      approveCUSDT.approve(address, approveEnc.handle, approveEnc.inputProof);

      setDepositStep("writing");
      writeDeposit({
        ...config,
        functionName: "deposit",
        args: [encResult.handle, encResult.inputProof],
      });
      setDepositStep("confirming");
    } catch {
      setDepositStep("error");
    }
  }, [userAddress, amountNum, address, fhe, approveCUSDT, writeDeposit, config]);

  /* ── Loading skeleton ──────────────────────────────────────── */
  if (isLoading) {
    return (
      <GlowCard style={{ padding: 22 }}>
        <div style={{ width: "50%", height: 18, marginBottom: 10, background: "var(--bg-2)", borderRadius: 3 }} />
        <div style={{ width: "80%", height: 14, marginBottom: 14, background: "var(--bg-2)", borderRadius: 3 }} />
        <div style={{ width: "100%", height: 36, background: "var(--bg-2)", borderRadius: 3 }} />
      </GlowCard>
    );
  }

  const isClosed = closed || isCloseClosed;
  const followers = followerCount ? Number(followerCount) : 0;
  const aum = publicTotalDeposits ? Number(publicTotalDeposits) / 1e6 : 0;
  const feePercent = perfFeeBps !== undefined ? (perfFeeBps / 100) : 0;
  const rep = 72; // placeholder rep score

  const C = 2 * Math.PI * 9;

  return (
    <GlowCard style={{ padding: 22 }}>
      {/* Top: name + manager + rep ring */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 22 }}>
        <div>
          <div className="serif" style={{ fontSize: 20, fontWeight: 500, letterSpacing: "-0.01em" }}>
            {name || "Unnamed Vault"}
          </div>
          <div className="mono" style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 4 }}>
            by {manager ? truncAddr(manager) : "--"}
          </div>
        </div>
        {/* rep ring */}
        <div style={{ position: "relative", width: 28, height: 28 }}>
          <svg width="28" height="28" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="9" fill="none" stroke="var(--line-2)" strokeWidth="1.5" />
            <circle
              cx="12" cy="12" r="9" fill="none"
              stroke="var(--gold)" strokeWidth="1.5"
              strokeDasharray={`${C * rep / 100} ${C}`}
              transform="rotate(-90 12 12)"
              strokeLinecap="round"
            />
          </svg>
          <span className="mono" style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, color: "var(--gold)" }}>
            {rep}
          </span>
        </div>
      </div>

      {/* Stats row */}
      <div
        className="mono"
        style={{ display: "flex", gap: 18, fontSize: 11, color: "var(--ink-3)", marginBottom: 18 }}
      >
        <span><span style={{ color: "var(--ink-1)" }}>{followers}</span> followers</span>
        <span style={{ color: "var(--ink-4)" }}>&middot;</span>
        <span><span style={{ color: "var(--ink-1)" }}>{fmtUSD(aum)}</span> AUM</span>
        <span style={{ color: "var(--ink-4)" }}>&middot;</span>
        <span style={{ color: isClosed ? "var(--no)" : "var(--yes)" }}>
          {isClosed ? "Closed" : "Active"}
        </span>
      </div>

      {/* Fee bar */}
      <div style={{ marginBottom: 22 }}>
        <div style={{ height: 6, borderRadius: 2, background: "var(--bg-3)", overflow: "hidden", position: "relative" }}>
          <div style={{ width: `${Math.min(feePercent * 4, 100)}%`, height: "100%", background: "linear-gradient(90deg, var(--gold-dim), var(--gold))" }} />
        </div>
        <div className="mono" style={{ fontSize: 10, color: "var(--ink-3)", marginTop: 6, letterSpacing: "0.06em" }}>
          {feePercent}% performance fee
        </div>
      </div>

      {/* Action buttons */}
      {!isClosed && !showDeposit && (
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => setShowDeposit(true)}
            style={{
              flex: 1,
              padding: "10px 0",
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
          {isManager ? (
            <button
              onClick={handleClose}
              disabled={isClosing || isCloseConfirming}
              style={{
                padding: "10px 16px",
                fontSize: 12,
                border: "1px solid var(--line-2)",
                borderRadius: 3,
                color: "var(--ink-2)",
                background: "transparent",
                display: "flex",
                alignItems: "center",
                gap: 6,
                cursor: "pointer",
              }}
            >
              {isClosing ? "Confirm..." : isCloseConfirming ? "Closing..." : "Close"}
            </button>
          ) : (
            <Link
              href={`/vaults`}
              style={{
                padding: "10px 16px",
                fontSize: 12,
                border: "1px solid var(--line-2)",
                borderRadius: 3,
                color: "var(--ink-2)",
                display: "flex",
                alignItems: "center",
                gap: 6,
                textDecoration: "none",
              }}
            >
              Details <Icon name="arrow-right" size={11} />
            </Link>
          )}
        </div>
      )}

      {/* Deposit form (expanded) */}
      {!isClosed && showDeposit && (
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
              isDepositWriting ||
              isDepositConfirming
            }
            style={{
              width: "100%",
              padding: "10px 0",
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
                  : depositStep === "writing" || isDepositWriting
                    ? "Confirm in wallet..."
                    : isDepositConfirming
                      ? "Confirming..."
                      : depositStep === "confirmed"
                        ? "Deposited"
                        : `Deposit ${amountNum > 0 ? `${amountNum} cUSDT` : ""}`}
          </button>

          {depositStep === "error" && (
            <div style={{ marginTop: 10, padding: "8px 12px", fontSize: 12, color: "var(--no)", border: "1px solid var(--line)", borderRadius: 3 }}>
              <p style={{ marginBottom: 6 }}>
                {fhe.error || depositWriteError?.message || "Something went wrong"}
              </p>
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

      {isClosed && (
        <div className="mono" style={{ fontSize: 11, color: "var(--ink-4)", textAlign: "center", padding: "8px 0" }}>
          Vault closed
        </div>
      )}
    </GlowCard>
  );
}

/* ── Vaults page ─────────────────────────────────────────────── */

export default function VaultsPage() {
  const { data: allVaults, isLoading } = useReadContract({
    ...vaultFactoryConfig,
    functionName: "getAllVaults",
  });

  const vaults = (allVaults as `0x${string}`[]) || [];

  return (
    <div className="page-in" style={{ maxWidth: 1280, margin: "0 auto", padding: "44px 48px 80px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 14 }}>
        <h1 className="serif" style={{ fontSize: 38, fontWeight: 500, letterSpacing: "-0.02em" }}>
          Vaults
        </h1>
        <Link
          href="/vaults/create"
          style={{
            fontSize: 12,
            padding: "8px 14px",
            border: "1px solid var(--line-2)",
            borderRadius: 3,
            color: "var(--ink-1)",
            display: "flex",
            alignItems: "center",
            gap: 6,
            textDecoration: "none",
          }}
        >
          <Icon name="plus" size={12} /> Create vault
        </Link>
      </div>

      <p style={{ color: "var(--ink-3)", fontSize: 13, marginBottom: 36, maxWidth: 520 }}>
        Follow a manager&apos;s strategy. Your deposits mirror their positions &mdash; without you or them seeing each other&apos;s sizes.
      </p>

      {/* Loading */}
      {isLoading && (
        <div style={{ textAlign: "center", padding: "60px 20px", color: "var(--ink-3)", fontSize: 13 }}>
          Loading vaults...
        </div>
      )}

      {/* Vault cards grid */}
      {!isLoading && vaults.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(380px, 1fr))", gap: 14 }}>
          {vaults.map((addr) => (
            <VaultCard key={addr} address={addr} />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && vaults.length === 0 && (
        <div style={{ padding: "80px 20px", textAlign: "center", color: "var(--ink-3)", fontSize: 13 }}>
          No vaults yet. Create the first strategy vault.
        </div>
      )}
    </div>
  );
}
