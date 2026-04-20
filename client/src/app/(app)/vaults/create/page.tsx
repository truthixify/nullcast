"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { vaultFactoryConfig } from "@/lib/contracts";
import { Icon } from "@/components/shared/Icons";

const TIER_OPTIONS = [
  { value: 0, label: "Open -- anyone can deposit" },
  { value: 20, label: "Explorer+ (score >= 20)" },
  { value: 40, label: "Analyst+ (score >= 40)" },
  { value: 60, label: "Strategist+ (score >= 60)" },
  { value: 80, label: "Oracle+ (score >= 80)" },
] as const;

/* ── Shared input style ─────────────────────────────────────────── */
const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  fontSize: 14,
  background: "transparent",
  border: "1px solid var(--line-2)",
  borderRadius: 3,
  color: "var(--ink-1)",
  outline: "none",
};

export default function CreateVaultPage() {
  const router = useRouter();
  const { isConnected } = useAccount();
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

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [requiredTier, setRequiredTier] = useState(20);
  const [performanceFee, setPerformanceFee] = useState("1000");

  const perfFeeNum = parseInt(performanceFee) || 0;
  const isFormValid =
    name.trim().length > 0 && perfFeeNum >= 0 && perfFeeNum <= 10000;

  const handleSubmit = () => {
    if (!isFormValid) return;
    writeContract({
      ...vaultFactoryConfig,
      functionName: "createVault",
      args: [name.trim(), description.trim(), requiredTier, perfFeeNum],
    });
  };

  if (isConfirmed) {
    setTimeout(() => router.push("/vaults"), 2000);
  }

  const error = writeError || confirmError;
  const txState = isConfirmed
    ? "confirmed"
    : isConfirming
      ? "confirming"
      : isWriting
        ? "writing"
        : "idle";

  return (
    <div className="page-in" style={{ maxWidth: 720, margin: "0 auto", padding: "44px 48px 80px" }}>
      {/* Back */}
      <Link
        href="/vaults"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          fontSize: 12,
          color: "var(--ink-3)",
          marginBottom: 24,
          textDecoration: "none",
        }}
      >
        <Icon name="chevron-left" size={12} />
        All vaults
      </Link>

      {/* Page head */}
      <h1 className="serif" style={{ fontSize: 38, fontWeight: 500, letterSpacing: "-0.02em", marginBottom: 32 }}>
        Create vault
      </h1>

      {/* Form */}
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        {/* Name */}
        <div>
          <label className="mono" style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--ink-3)", display: "block", marginBottom: 6 }}>
            Vault name *
          </label>
          <input
            type="text"
            placeholder="Alpha Predictions Fund"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={txState !== "idle"}
            style={inputStyle}
          />
          <span className="mono" style={{ fontSize: 10, color: "var(--ink-4)", marginTop: 4, display: "block" }}>
            A descriptive name for your strategy vault.
          </span>
        </div>

        {/* Description */}
        <div>
          <label className="mono" style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--ink-3)", display: "block", marginBottom: 6 }}>
            Description
          </label>
          <textarea
            placeholder="Describe your trading strategy..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={txState !== "idle"}
            rows={3}
            style={{ ...inputStyle, resize: "vertical", minHeight: 80 }}
          />
        </div>

        {/* Required tier + Performance fee grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div>
            <label className="mono" style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--ink-3)", display: "block", marginBottom: 6 }}>
              Required reputation tier
            </label>
            <select
              value={requiredTier}
              onChange={(e) => setRequiredTier(parseInt(e.target.value))}
              disabled={txState !== "idle"}
              style={{ ...inputStyle, colorScheme: "dark" }}
            >
              {TIER_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <span className="mono" style={{ fontSize: 10, color: "var(--ink-4)", marginTop: 4, display: "block" }}>
              Minimum reputation to deposit
            </span>
          </div>

          <div>
            <label className="mono" style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--ink-3)", display: "block", marginBottom: 6 }}>
              Performance fee (basis points)
            </label>
            <div style={{ display: "flex", border: "1px solid var(--line-2)", borderRadius: 3, overflow: "hidden" }}>
              <input
                type="number"
                value={performanceFee}
                onChange={(e) => setPerformanceFee(e.target.value)}
                disabled={txState !== "idle"}
                min="0"
                max="10000"
                step="100"
                placeholder="1000"
                className="mono"
                style={{
                  flex: 1,
                  padding: "10px 12px",
                  fontSize: 14,
                  background: "transparent",
                  border: "none",
                  color: "var(--ink-1)",
                  outline: "none",
                }}
              />
              <span className="mono" style={{ padding: "10px 12px", fontSize: 11, color: "var(--ink-3)", display: "flex", alignItems: "center" }}>
                bps
              </span>
            </div>
            <span className="mono" style={{ fontSize: 10, color: "var(--ink-4)", marginTop: 4, display: "block" }}>
              1000 bps = 10%. Max 10000 bps (100%).
            </span>
          </div>
        </div>

        {/* Separator */}
        <div style={{ borderBottom: "1px solid var(--line)", margin: "8px 0" }} />

        {/* Error */}
        {error && (
          <div style={{ padding: "12px 16px", border: "1px solid var(--line)", borderRadius: 3, fontSize: 13, color: "var(--no)" }}>
            {error.message?.includes("User rejected")
              ? "Transaction rejected by user."
              : error.message ?? "Transaction failed. Please try again."}
          </div>
        )}

        {/* Tx status */}
        {txState !== "idle" && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
            {txState === "confirmed" ? (
              <>
                <Icon name="check" size={14} color="var(--yes)" />
                <span style={{ color: "var(--yes)", fontWeight: 500 }}>Vault created</span>
                {hash && (
                  <a
                    href={`https://sepolia.etherscan.io/tx/${hash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mono"
                    style={{ color: "var(--gold)", fontSize: 12 }}
                  >
                    Etherscan <Icon name="external" size={11} />
                  </a>
                )}
                <span className="mono" style={{ color: "var(--ink-3)", fontSize: 12 }}>Redirecting...</span>
              </>
            ) : (
              <>
                <span
                  style={{
                    width: 14,
                    height: 14,
                    borderRadius: "50%",
                    border: "2px solid var(--gold)",
                    borderTopColor: "transparent",
                    animation: "spin 1s linear infinite",
                    flexShrink: 0,
                  }}
                />
                <span style={{ color: "var(--ink-2)" }}>
                  {txState === "writing" ? "Confirm in wallet..." : "Waiting for confirmation..."}
                </span>
              </>
            )}
          </div>
        )}

        {/* Actions */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Link
            href="/vaults"
            style={{ fontSize: 13, color: "var(--ink-3)", textDecoration: "none" }}
          >
            Cancel
          </Link>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!isConnected || !isFormValid || txState !== "idle"}
            style={{
              padding: "10px 24px",
              fontSize: 13,
              background: "var(--gold)",
              color: "#1A1511",
              borderRadius: 3,
              fontWeight: 500,
              border: "none",
              cursor: "pointer",
              opacity: (!isConnected || !isFormValid || txState !== "idle") ? 0.5 : 1,
            }}
          >
            {!isConnected
              ? "Connect wallet to deploy"
              : txState === "idle"
                ? "Create Vault"
                : "Processing..."}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
