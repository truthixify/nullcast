"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAccount, useBlockNumber } from "wagmi";
import { useCreateMarket } from "@/hooks/useFactory";
import {
  IconChevronLeft,
  IconShield,
  IconCheck,
  IconExternal,
  LockIcon,
} from "@/components/shared/Icons";

const SEPOLIA_BLOCK_TIME_SECONDS = 12;

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

  // Redirect on success after a short delay
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
    <div className="container" style={{ paddingTop: "32px", paddingBottom: "80px" }}>
      <div style={{ maxWidth: "720px", margin: "0 auto" }}>
        {/* Back button */}
        <Link
          href="/markets"
          className="btn btn-ghost"
          style={{ marginBottom: "24px", display: "inline-flex" }}
        >
          <IconChevronLeft size={14} />
          Back to Markets
        </Link>

        {/* Title + subtitle */}
        <div style={{ marginBottom: "32px" }}>
          <h1
            className="display"
            style={{
              fontSize: "var(--text-2xl)",
              fontWeight: 700,
              letterSpacing: "-0.04em",
              marginBottom: "8px",
            }}
          >
            Create market
          </h1>
          <p
            style={{
              fontSize: "var(--text-sm)",
              color: "var(--color-text-tertiary)",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <IconShield size={13} stroke="var(--color-text-tertiary)" />
            Requires reputation score of 40 or higher to create a market
          </p>
        </div>

        {/* Not connected state */}
        {!isConnected && (
          <div
            className="card"
            style={{
              padding: "48px 32px",
              textAlign: "center",
            }}
          >
            <LockIcon size={32} stroke="var(--color-text-tertiary)" />
            <p
              style={{
                fontSize: "var(--text-base)",
                fontWeight: 500,
                color: "var(--color-text-secondary)",
                marginTop: "16px",
              }}
            >
              Connect your wallet to create a market
            </p>
            <p
              style={{
                fontSize: "var(--text-sm)",
                color: "var(--color-text-tertiary)",
                marginTop: "8px",
              }}
            >
              You need a connected wallet and sufficient reputation to create prediction markets.
            </p>
          </div>
        )}

        {/* Form (only when connected) */}
        {isConnected && (
          <>
            <div className="card" style={{ padding: "32px", marginBottom: "24px" }}>
              {/* Question input */}
              <div style={{ marginBottom: "32px" }}>
                <label
                  style={{
                    display: "block",
                    fontSize: "10px",
                    fontFamily: "var(--font-mono)",
                    color: "var(--color-text-tertiary)",
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                    marginBottom: "10px",
                  }}
                >
                  Market question *
                </label>
                <input
                  type="text"
                  className="display"
                  placeholder="Will [event] happen by [date]?"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  disabled={txState !== "idle"}
                  style={{
                    width: "100%",
                    background: "none",
                    border: "none",
                    borderBottom: "2px solid var(--color-border-default)",
                    outline: "none",
                    fontSize: "var(--text-xl)",
                    fontWeight: 600,
                    letterSpacing: "-0.03em",
                    color: "var(--color-text-primary)",
                    padding: "12px 0",
                    transition: "border-color 200ms var(--ease-out)",
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderBottomColor = "var(--color-accent)";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderBottomColor = "var(--color-border-default)";
                  }}
                />
                <p
                  style={{
                    fontSize: "var(--text-xs)",
                    color: "var(--color-text-tertiary)",
                    marginTop: "8px",
                  }}
                >
                  Write a clear, binary (yes/no) question. Ambiguous questions may be disputed.
                </p>
              </div>

              {/* Market type + Expiry grid */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "24px",
                  marginBottom: "24px",
                }}
              >
                {/* Market type */}
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "10px",
                      fontFamily: "var(--font-mono)",
                      color: "var(--color-text-tertiary)",
                      textTransform: "uppercase",
                      letterSpacing: "0.1em",
                      marginBottom: "10px",
                    }}
                  >
                    Market type
                  </label>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      type="button"
                      className={`chip${marketType === "binary" ? " chip--active" : ""}`}
                      onClick={() => setMarketType("binary")}
                      disabled={txState !== "idle"}
                      style={{
                        borderColor: marketType === "binary" ? "var(--color-accent)" : undefined,
                        background: marketType === "binary" ? "var(--color-accent-muted)" : undefined,
                        color: marketType === "binary" ? "var(--color-accent-bright)" : undefined,
                      }}
                    >
                      Binary
                    </button>
                    <button
                      type="button"
                      className={`chip${marketType === "scalar" ? " chip--active" : ""}`}
                      onClick={() => setMarketType("scalar")}
                      disabled={txState !== "idle"}
                      style={{
                        borderColor: marketType === "scalar" ? "var(--color-accent)" : undefined,
                        background: marketType === "scalar" ? "var(--color-accent-muted)" : undefined,
                        color: marketType === "scalar" ? "var(--color-accent-bright)" : undefined,
                      }}
                    >
                      Scalar
                    </button>
                  </div>
                </div>

                {/* Expiry date */}
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "10px",
                      fontFamily: "var(--font-mono)",
                      color: "var(--color-text-tertiary)",
                      textTransform: "uppercase",
                      letterSpacing: "0.1em",
                      marginBottom: "10px",
                    }}
                  >
                    Expiry date
                  </label>
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
                    <p
                      className="mono"
                      style={{
                        fontSize: "var(--text-xs)",
                        color: "var(--color-text-tertiary)",
                        marginTop: "6px",
                      }}
                    >
                      Approx. block #{expiryBlock.toString()}
                    </p>
                  )}
                </div>
              </div>

              {/* Minimum bet + Bucket count */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: marketType === "scalar" ? "1fr 1fr" : "1fr",
                  gap: "24px",
                }}
              >
                {/* Minimum bet */}
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "10px",
                      fontFamily: "var(--font-mono)",
                      color: "var(--color-text-tertiary)",
                      textTransform: "uppercase",
                      letterSpacing: "0.1em",
                      marginBottom: "10px",
                    }}
                  >
                    Minimum bet (cUSDT)
                  </label>
                  <input
                    type="number"
                    className="input"
                    value={minimumBet}
                    onChange={(e) => setMinimumBet(e.target.value)}
                    disabled={txState !== "idle"}
                    min="0.01"
                    step="0.01"
                    placeholder="1"
                    style={{ colorScheme: "dark" }}
                  />
                  <p
                    style={{
                      fontSize: "var(--text-xs)",
                      color: "var(--color-text-tertiary)",
                      marginTop: "6px",
                    }}
                  >
                    Minimum amount per bet in cUSDT (6 decimals)
                  </p>
                </div>

                {/* Bucket count (scalar only) */}
                {marketType === "scalar" && (
                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: "10px",
                        fontFamily: "var(--font-mono)",
                        color: "var(--color-text-tertiary)",
                        textTransform: "uppercase",
                        letterSpacing: "0.1em",
                        marginBottom: "10px",
                      }}
                    >
                      Bucket count
                    </label>
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
                      style={{ colorScheme: "dark" }}
                    />
                    <p
                      style={{
                        fontSize: "var(--text-xs)",
                        color: "var(--color-text-tertiary)",
                        marginTop: "6px",
                      }}
                    >
                      Number of outcome buckets (2-10)
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Error display */}
            {error && (
              <div
                className="card"
                style={{
                  padding: "16px 20px",
                  marginBottom: "16px",
                  background: "rgba(255, 59, 48, 0.08)",
                  border: "1px solid rgba(255, 59, 48, 0.2)",
                  borderRadius: "10px",
                }}
              >
                <p
                  style={{
                    fontSize: "var(--text-sm)",
                    color: "var(--color-no-text)",
                    wordBreak: "break-word",
                  }}
                >
                  {error.message?.includes("User rejected")
                    ? "Transaction rejected by user."
                    : error.message ?? "Transaction failed. Please try again."}
                </p>
              </div>
            )}

            {/* Transaction status */}
            {txState !== "idle" && (
              <div
                className="card"
                style={{
                  padding: "20px 24px",
                  marginBottom: "16px",
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                }}
              >
                {txState === "writing" && (
                  <>
                    <div
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: "50%",
                        border: "2px solid var(--color-accent)",
                        borderTopColor: "transparent",
                        animation: "spin 1s linear infinite",
                      }}
                    />
                    <span style={{ fontSize: "var(--text-sm)", color: "var(--color-text-secondary)" }}>
                      Confirm transaction in your wallet...
                    </span>
                  </>
                )}
                {txState === "confirming" && (
                  <>
                    <div
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: "50%",
                        border: "2px solid var(--color-accent)",
                        borderTopColor: "transparent",
                        animation: "spin 1s linear infinite",
                      }}
                    />
                    <div>
                      <span style={{ fontSize: "var(--text-sm)", color: "var(--color-text-secondary)" }}>
                        Waiting for confirmation...
                      </span>
                      {hash && (
                        <a
                          href={`https://sepolia.etherscan.io/tx/${hash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                            fontSize: "var(--text-xs)",
                            color: "var(--color-accent-bright)",
                            marginTop: "4px",
                          }}
                        >
                          View on Etherscan
                          <IconExternal size={11} stroke="var(--color-accent-bright)" />
                        </a>
                      )}
                    </div>
                  </>
                )}
                {txState === "confirmed" && (
                  <>
                    <div
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: "50%",
                        background: "var(--color-yes-muted)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <IconCheck size={12} stroke="var(--color-yes-text)" />
                    </div>
                    <div>
                      <span style={{ fontSize: "var(--text-sm)", color: "var(--color-yes-text)", fontWeight: 500 }}>
                        Market created successfully!
                      </span>
                      {hash && (
                        <a
                          href={`https://sepolia.etherscan.io/tx/${hash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                            fontSize: "var(--text-xs)",
                            color: "var(--color-accent-bright)",
                            marginTop: "4px",
                          }}
                        >
                          View on Etherscan
                          <IconExternal size={11} stroke="var(--color-accent-bright)" />
                        </a>
                      )}
                      <p style={{ fontSize: "var(--text-xs)", color: "var(--color-text-tertiary)", marginTop: "4px" }}>
                        Redirecting to markets...
                      </p>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Submit button */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-end",
              }}
            >
              <button
                className="btn btn-primary btn-lg"
                type="button"
                onClick={handleSubmit}
                disabled={!isFormValid || txState !== "idle"}
                style={{
                  opacity: !isFormValid || txState !== "idle" ? 0.5 : 1,
                  pointerEvents: !isFormValid || txState !== "idle" ? "none" : "auto",
                }}
              >
                {txState === "idle" ? "Create Market" : "Processing..."}
              </button>
            </div>
          </>
        )}
      </div>

      {/* Spin animation for loading indicators */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
