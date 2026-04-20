"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { vaultFactoryConfig } from "@/lib/contracts";
import {
  ChevronIcon,
  CheckIcon,
  ExternalIcon,
} from "@/components/shared/Icons";

const TIER_OPTIONS = [
  { value: 0, label: "Open — anyone can deposit" },
  { value: 20, label: "Explorer+ (score ≥ 20)" },
  { value: 40, label: "Analyst+ (score ≥ 40)" },
  { value: 60, label: "Strategist+ (score ≥ 60)" },
  { value: 80, label: "Oracle+ (score ≥ 80)" },
] as const;

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
    <div className="page">
      <div className="container" style={{ maxWidth: 720 }}>
        {/* Back */}
        <Link href="/vaults" className="btn ghost sm" style={{ marginBottom: 24 }}>
          <ChevronIcon size={12} direction="left" />
          All vaults
        </Link>

        {/* Page head */}
        <div className="page-head" style={{ padding: 0, marginBottom: 32 }}>
          <h1 style={{ fontSize: 36 }}>Create vault</h1>
          <p className="sub">
            Deploy a new strategy vault. Followers deposit and you trade on their behalf.
          </p>
        </div>

        {/* Form */}
        <div className="card elevated" style={{ overflow: "hidden" }}>
          <div className="card-body" style={{ padding: 24 }}>
            <div className="stack gap-6">
              {/* Name */}
              <div className="field">
                <label>Vault name *</label>
                <input
                  type="text"
                  className="input lg"
                  placeholder="Alpha Predictions Fund"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={txState !== "idle"}
                />
                <span className="hint">
                  A descriptive name for your strategy vault.
                </span>
              </div>

              {/* Description */}
              <div className="field">
                <label>Description</label>
                <textarea
                  className="input"
                  placeholder="Describe your trading strategy..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={txState !== "idle"}
                  rows={3}
                  style={{ resize: "vertical", minHeight: 80 }}
                />
              </div>

              {/* Required tier + Performance fee grid */}
              <div className="grid-2">
                <div className="field">
                  <label>Required reputation tier</label>
                  <select
                    className="input"
                    value={requiredTier}
                    onChange={(e) => setRequiredTier(parseInt(e.target.value))}
                    disabled={txState !== "idle"}
                    style={{ colorScheme: "dark" }}
                  >
                    {TIER_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <span className="hint">
                    Minimum reputation to deposit
                  </span>
                </div>

                <div className="field">
                  <label>Performance fee (basis points)</label>
                  <div className="input-row">
                    <input
                      type="number"
                      className="input"
                      value={performanceFee}
                      onChange={(e) => setPerformanceFee(e.target.value)}
                      disabled={txState !== "idle"}
                      min="0"
                      max="10000"
                      step="100"
                      placeholder="1000"
                    />
                    <span className="unit">bps</span>
                  </div>
                  <span className="hint">
                    1000 bps = 10%. Max 10000 bps (100%).
                  </span>
                </div>
              </div>

              {/* Info box */}
              <div
                style={{
                  background: "var(--bg-0)",
                  border: "1px solid var(--border-1)",
                  borderRadius: "var(--r-md)",
                  padding: 16,
                }}
              >
                <span className="eyebrow" style={{ display: "block", marginBottom: 8 }}>
                  Before you deploy
                </span>
                <p style={{ fontSize: 12, color: "var(--t-3)", lineHeight: 1.6, margin: 0 }}>
                  Creating a vault deploys a new contract to Sepolia. You will be the vault
                  manager and can place bets from the vault. Followers deposit encrypted
                  cUSDT and share in profits (minus your performance fee).
                </p>
              </div>

              <hr className="divider" />

              {/* Error */}
              {error && (
                <div
                  style={{
                    padding: "12px 16px",
                    background: "var(--no-bg)",
                    border: "1px solid var(--no-bd)",
                    borderRadius: "var(--r-md)",
                    fontSize: 13,
                    color: "var(--no-hi)",
                    wordBreak: "break-word",
                  }}
                >
                  {error.message?.includes("User rejected")
                    ? "Transaction rejected by user."
                    : error.message ?? "Transaction failed. Please try again."}
                </div>
              )}

              {/* Tx status */}
              {txState !== "idle" && (
                <div className="row gap-2" style={{ fontSize: 13 }}>
                  {txState === "confirmed" ? (
                    <>
                      <CheckIcon size={14} />
                      <span style={{ color: "var(--yes-hi)", fontWeight: 500 }}>
                        Vault created
                      </span>
                      {hash && (
                        <a
                          href={`https://sepolia.etherscan.io/tx/${hash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="row gap-2"
                          style={{ color: "var(--acc)", fontSize: 12 }}
                        >
                          Etherscan <ExternalIcon size={11} />
                        </a>
                      )}
                      <span className="mono" style={{ color: "var(--t-3)", fontSize: 12 }}>
                        Redirecting...
                      </span>
                    </>
                  ) : (
                    <>
                      <span
                        style={{
                          width: 14,
                          height: 14,
                          borderRadius: "50%",
                          border: "2px solid var(--acc)",
                          borderTopColor: "transparent",
                          animation: "spin 1s linear infinite",
                          flexShrink: 0,
                        }}
                      />
                      <span style={{ color: "var(--t-2)" }}>
                        {txState === "writing"
                          ? "Confirm in wallet..."
                          : "Waiting for confirmation..."}
                      </span>
                      {hash && (
                        <a
                          href={`https://sepolia.etherscan.io/tx/${hash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="row gap-2"
                          style={{ color: "var(--acc)", fontSize: 12 }}
                        >
                          Etherscan <ExternalIcon size={11} />
                        </a>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="row between">
                <Link href="/vaults" className="btn ghost">
                  Cancel
                </Link>
                <button
                  className="btn primary lg"
                  type="button"
                  onClick={handleSubmit}
                  disabled={!isConnected || !isFormValid || txState !== "idle"}
                >
                  {!isConnected
                    ? "Connect wallet to deploy"
                    : txState === "idle"
                      ? "Create Vault"
                      : "Processing..."}
                </button>
              </div>
            </div>
          </div>
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
