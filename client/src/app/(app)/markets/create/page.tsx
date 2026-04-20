"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAccount, useBlockNumber } from "wagmi";
import { stringToHex } from "viem";
import { useCreateMarket } from "@/hooks/useFactory";
import { Icon } from "@/components/shared/Icons";

const CATEGORY_OPTIONS = ["CRYPTO", "MACRO", "EQUITY", "SPORTS", "TECH", "OTHER"] as const;

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
      onClick={onClick}
      disabled={disabled}
      style={{
        flex: 1,
        padding: 16,
        textAlign: "left",
        cursor: disabled ? "not-allowed" : "pointer",
        background: active ? "rgba(212,168,67,0.08)" : "transparent",
        border: `1px solid ${active ? "var(--gold-dim)" : "var(--line-2)"}`,
        borderRadius: 3,
      }}
    >
      <div
        className="serif"
        style={{
          fontSize: 16,
          fontWeight: 500,
          color: active ? "var(--gold)" : "var(--ink-1)",
          marginBottom: 4,
        }}
      >
        {title}
      </div>
      <div style={{ fontSize: 12, color: "var(--ink-3)" }}>{sub}</div>
    </button>
  );
}

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
  const [category, setCategory] = useState<typeof CATEGORY_OPTIONS[number]>("CRYPTO");

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
    const categoryBytes = stringToHex(category, { size: 32 });
    createMarket(question.trim(), expiryBlock, minimumBetInBaseUnits, buckets, categoryBytes);
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
    <div className="page-in" style={{ maxWidth: 720, margin: "0 auto", padding: "44px 48px 80px" }}>
      {/* Back */}
      <Link
        href="/markets"
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
        All markets
      </Link>

      {/* Page head */}
      <h1 className="serif" style={{ fontSize: 38, fontWeight: 500, letterSpacing: "-0.02em", marginBottom: 32 }}>
        Create market
      </h1>

      {/* Form */}
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        {/* Question */}
        <div>
          <label className="mono" style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--ink-3)", display: "block", marginBottom: 6 }}>
            Market question *
          </label>
          <input
            type="text"
            placeholder="Will [event] happen by [date]?"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            disabled={txState !== "idle"}
            style={inputStyle}
          />
          <span className="mono" style={{ fontSize: 10, color: "var(--ink-4)", marginTop: 4, display: "block" }}>
            Write a clear yes/no question. Ambiguous questions may be disputed.
          </span>
        </div>

        {/* Market type */}
        <div>
          <label className="mono" style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--ink-3)", display: "block", marginBottom: 6 }}>
            Market type
          </label>
          <div style={{ display: "flex", gap: 8 }}>
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

        {/* Category */}
        <div>
          <label className="mono" style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--ink-3)", display: "block", marginBottom: 6 }}>
            Category
          </label>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {CATEGORY_OPTIONS.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                disabled={txState !== "idle"}
                className="mono"
                style={{
                  padding: "6px 14px",
                  fontSize: 11,
                  border: `1px solid ${category === cat ? "var(--gold-dim)" : "var(--line)"}`,
                  borderRadius: 3,
                  color: category === cat ? "var(--gold)" : "var(--ink-3)",
                  background: category === cat ? "rgba(212,168,67,0.08)" : "transparent",
                  cursor: "pointer",
                }}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Scalar bucket count */}
        {marketType === "scalar" && (
          <div>
            <label className="mono" style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--ink-3)", display: "block", marginBottom: 6 }}>
              Bucket count
            </label>
            <input
              type="number"
              value={bucketCount}
              onChange={(e) => setBucketCount(e.target.value)}
              disabled={txState !== "idle"}
              min="2"
              max="10"
              step="1"
              placeholder="3"
              style={{ ...inputStyle, width: 120 }}
            />
            <span className="mono" style={{ fontSize: 10, color: "var(--ink-4)", marginTop: 4, display: "block" }}>
              Number of outcome buckets (2-10)
            </span>
          </div>
        )}

        {/* Expiry + Min bet grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div>
            <label className="mono" style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--ink-3)", display: "block", marginBottom: 6 }}>
              Expiry date
            </label>
            <input
              type="date"
              value={expiry}
              onChange={(e) => setExpiry(e.target.value)}
              disabled={txState !== "idle"}
              min={new Date().toISOString().split("T")[0]}
              style={{ ...inputStyle, colorScheme: "dark" }}
            />
            {expiryBlock && (
              <span className="mono" style={{ fontSize: 10, color: "var(--ink-4)", marginTop: 4, display: "block" }}>
                Block #{expiryBlock.toString()}
              </span>
            )}
          </div>

          <div>
            <label className="mono" style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--ink-3)", display: "block", marginBottom: 6 }}>
              Minimum bet
            </label>
            <div style={{ display: "flex", border: "1px solid var(--line-2)", borderRadius: 3, overflow: "hidden" }}>
              <input
                type="number"
                value={minimumBet}
                onChange={(e) => setMinimumBet(e.target.value)}
                disabled={txState !== "idle"}
                min="0.01"
                step="0.01"
                placeholder="1"
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
                cUSDT
              </span>
            </div>
            <span className="mono" style={{ fontSize: 10, color: "var(--ink-4)", marginTop: 4, display: "block" }}>
              6 decimal precision
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
                <span style={{ color: "var(--yes)", fontWeight: 500 }}>Market created</span>
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
            href="/markets"
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
                ? "Create Market"
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
