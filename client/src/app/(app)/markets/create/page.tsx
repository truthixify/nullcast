"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAccount, useBlockNumber } from "wagmi";
import { useCreateMarket } from "@/hooks/useFactory";
import {
  ChevronIcon,
  CheckIcon,
  ExternalIcon,
} from "@/components/shared/Icons";

const SEPOLIA_BLOCK_TIME_SECONDS = 12;

/* ── TypeTile ──────────────────────────────────────────────────── */
function TypeTile({
  title,
  sub,
  active,
  disabled,
  onClick,
}: {
  title: string;
  sub: string;
  active: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="card inter"
      onClick={onClick}
      disabled={disabled}
      style={{
        flex: 1,
        padding: "16px",
        textAlign: "left",
        cursor: disabled ? "not-allowed" : "pointer",
        background: active ? "var(--acc-bg)" : undefined,
        borderColor: active ? "var(--acc-bd)" : undefined,
      }}
    >
      <div
        className="display"
        style={{
          fontSize: 16,
          color: active ? "var(--acc)" : "var(--t-1)",
          marginBottom: 4,
        }}
      >
        {title}
      </div>
      <div style={{ fontSize: 12, color: "var(--t-3)" }}>{sub}</div>
    </button>
  );
}

export default function CreateMarketPage() {
  const router = useRouter();
  const { isConnected } = useAccount();
  const { data: currentBlock } = useBlockNumber();
  const {
    createMarket,
    hash,
    isWriting,
    isConfirming,
    isConfirmed,
    error,
  } = useCreateMarket();

  const [question, setQuestion] = useState("");
  const [expiry, setExpiry] = useState("");
  const [minimumBet, setMinimumBet] = useState("1");
  const [marketType, setMarketType] = useState<"binary" | "scalar">("binary");
  const [bucketCount, setBucketCount] = useState("3");

  const expiryBlock = useMemo(() => {
    if (!expiry || !currentBlock) return undefined;
    const targetDate = new Date(expiry + "T23:59:59Z");
    const now = Date.now();
    const diffSeconds = Math.floor((targetDate.getTime() - now) / 1000);
    if (diffSeconds <= 0) return undefined;
    const blocksUntilExpiry = Math.ceil(diffSeconds / SEPOLIA_BLOCK_TIME_SECONDS);
    return currentBlock + BigInt(blocksUntilExpiry);
  }, [expiry, currentBlock]);

  const minimumBetInBaseUnits = useMemo(() => {
    const parsed = parseFloat(minimumBet);
    if (isNaN(parsed) || parsed <= 0) return undefined;
    return BigInt(Math.floor(parsed * 1e6));
  }, [minimumBet]);

  const isFormValid =
    question.trim().length > 0 &&
    !!expiryBlock &&
    !!minimumBetInBaseUnits &&
    (marketType === "binary" || (marketType === "scalar" && parseInt(bucketCount) >= 2));

  const handleSubmit = () => {
    if (!isFormValid || !expiryBlock || !minimumBetInBaseUnits) return;
    const buckets = marketType === "scalar" ? parseInt(bucketCount) : 0;
    createMarket(question.trim(), expiryBlock, minimumBetInBaseUnits, buckets);
  };

  if (isConfirmed) {
    setTimeout(() => router.push("/markets"), 2000);
  }

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
        <Link href="/markets" className="btn ghost sm" style={{ marginBottom: 24 }}>
          <ChevronIcon size={12} direction="left" />
          All markets
        </Link>

        {/* Page head */}
        <div className="page-head" style={{ padding: 0, marginBottom: 32 }}>
          <h1 style={{ fontSize: 36 }}>Create market</h1>
          <p className="sub">
            Deploy a new prediction market to Sepolia. Resolves via oracle.
          </p>
        </div>

        {/* Form */}
        <div className="card elevated" style={{ overflow: "hidden" }}>
              <div className="card-body" style={{ padding: 24 }}>
                <div className="stack gap-6">
                  {/* Question */}
                  <div className="field">
                    <label>Market question *</label>
                    <input
                      type="text"
                      className="input lg"
                      placeholder="Will [event] happen by [date]?"
                      value={question}
                      onChange={(e) => setQuestion(e.target.value)}
                      disabled={txState !== "idle"}
                    />
                    <span className="hint">
                      Write a clear yes/no question. Ambiguous questions may be disputed.
                    </span>
                  </div>

                  {/* Market type */}
                  <div className="field">
                    <label>Market type</label>
                    <div className="row gap-2">
                      <TypeTile
                        title="Binary"
                        sub="Yes or No outcome"
                        active={marketType === "binary"}
                        disabled={txState !== "idle"}
                        onClick={() => setMarketType("binary")}
                      />
                      <TypeTile
                        title="Scalar"
                        sub="Multiple outcome buckets"
                        active={marketType === "scalar"}
                        disabled={txState !== "idle"}
                        onClick={() => setMarketType("scalar")}
                      />
                    </div>
                  </div>

                  {/* Scalar bucket count */}
                  {marketType === "scalar" && (
                    <div className="field">
                      <label>Bucket count</label>
                      <input
                        type="number"
                        className="input"
                        value={bucketCount}
                        onChange={(e) => setBucketCount(e.target.value)}
                        disabled={txState !== "idle"}
                        min="2"
                        max="10"
                        step="1"
                        placeholder="3"
                      />
                      <span className="hint">Number of outcome buckets (2-10)</span>
                    </div>
                  )}

                  {/* Expiry + Min bet grid */}
                  <div className="grid-2">
                    <div className="field">
                      <label>Expiry date</label>
                      <input
                        type="date"
                        className="input"
                        value={expiry}
                        onChange={(e) => setExpiry(e.target.value)}
                        disabled={txState !== "idle"}
                        min={new Date().toISOString().split("T")[0]}
                        style={{ colorScheme: "dark" }}
                      />
                      {expiryBlock && (
                        <span className="hint mono">
                          Block #{expiryBlock.toString()}
                        </span>
                      )}
                    </div>

                    <div className="field">
                      <label>Minimum bet</label>
                      <div className="input-row">
                        <input
                          type="number"
                          className="input"
                          value={minimumBet}
                          onChange={(e) => setMinimumBet(e.target.value)}
                          disabled={txState !== "idle"}
                          min="0.01"
                          step="0.01"
                          placeholder="1"
                        />
                        <span className="unit">cUSDT</span>
                      </div>
                      <span className="hint">6 decimal precision</span>
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
                      Creating a market deploys a new contract to Sepolia. You need a reputation
                      score of 40+ and sufficient ETH for gas. The market question cannot be
                      changed after deployment.
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
                            Market created
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
                    <Link href="/markets" className="btn ghost">
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
                          ? "Create Market"
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
