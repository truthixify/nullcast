"use client";

import { useMarket } from "@/hooks/useMarket";
import { OddsBar } from "./OddsBar";
import { IconClock } from "./Icons";

const STATUS_LABELS: Record<number, string> = {
  0: "Open",
  1: "Expired",
  2: "Resolving",
  3: "Resolved",
  4: "Cancelled",
};

const STATUS_PILL_CLASS: Record<number, string> = {
  0: "pill pill-yes",
  1: "pill pill-warning",
  2: "pill pill-warning",
  3: "pill",
  4: "pill pill-no",
};

interface MarketCardProps {
  address: `0x${string}`;
  onClick: () => void;
}

const formatCUSDT = (value: number): string => {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export const MarketCard = ({ address, onClick }: MarketCardProps) => {
  const {
    question,
    status,
    marketType,
    expiryBlock,
    totalPool,
    yesOdds,
    noOdds,
    isLoading,
  } = useMarket(address);

  if (isLoading) {
    return (
      <div className="card market-card" style={{ minHeight: "180px" }}>
        {/* Skeleton: top row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "12px",
          }}
        >
          <div
            style={{
              width: "60px",
              height: "20px",
              borderRadius: "6px",
              background: "var(--color-border-subtle)",
              animation: "pulse 1.5s ease-in-out infinite",
            }}
          />
          <div
            style={{
              width: "80px",
              height: "16px",
              borderRadius: "4px",
              background: "var(--color-border-subtle)",
              animation: "pulse 1.5s ease-in-out infinite",
            }}
          />
        </div>

        {/* Skeleton: question */}
        <div
          style={{
            width: "100%",
            height: "18px",
            borderRadius: "4px",
            background: "var(--color-border-subtle)",
            marginBottom: "8px",
            animation: "pulse 1.5s ease-in-out infinite",
          }}
        />
        <div
          style={{
            width: "60%",
            height: "18px",
            borderRadius: "4px",
            background: "var(--color-border-subtle)",
            marginBottom: "16px",
            animation: "pulse 1.5s ease-in-out infinite",
          }}
        />

        {/* Skeleton: odds bar */}
        <div
          style={{
            width: "100%",
            height: "24px",
            borderRadius: "6px",
            background: "var(--color-border-subtle)",
            marginBottom: "16px",
            animation: "pulse 1.5s ease-in-out infinite",
          }}
        />

        {/* Skeleton: stats */}
        <div
          style={{
            borderTop: "1px solid var(--color-border-subtle)",
            paddingTop: "12px",
            display: "flex",
            gap: "16px",
          }}
        >
          <div
            style={{
              width: "80px",
              height: "14px",
              borderRadius: "4px",
              background: "var(--color-border-subtle)",
              animation: "pulse 1.5s ease-in-out infinite",
            }}
          />
          <div
            style={{
              width: "60px",
              height: "14px",
              borderRadius: "4px",
              background: "var(--color-border-subtle)",
              animation: "pulse 1.5s ease-in-out infinite",
            }}
          />
        </div>
      </div>
    );
  }

  const statusNum = typeof status === "number" ? status : 0;
  const typeLabel = marketType === 1 ? "Scalar" : "Binary";

  return (
    <div
      className="card card-interactive market-card"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
    >
      {/* Top row: status + type + expiry */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "12px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span className={STATUS_PILL_CLASS[statusNum] ?? "pill"}>
            {STATUS_LABELS[statusNum] ?? "Unknown"}
          </span>
          <span className="pill">{typeLabel}</span>
        </div>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "4px",
            fontSize: "11px",
            color: "var(--color-text-tertiary)",
            fontFamily: "var(--font-mono)",
          }}
        >
          <IconClock size={11} stroke="var(--color-text-tertiary)" />
          Block {expiryBlock ? expiryBlock.toString() : "---"}
        </span>
      </div>

      {/* Question */}
      <h3
        style={{
          fontSize: "var(--text-base)",
          fontWeight: 600,
          lineHeight: "var(--leading-snug)",
          marginBottom: "16px",
          letterSpacing: "-0.02em",
        }}
      >
        {question ?? "Loading..."}
      </h3>

      {/* Odds bar */}
      <div style={{ marginBottom: "16px" }}>
        <OddsBar yes={yesOdds} no={noOdds} showMeta={false} />
      </div>

      {/* Stats row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderTop: "1px solid var(--color-border-subtle)",
          paddingTop: "12px",
        }}
      >
        <div
          className="mono"
          style={{
            display: "flex",
            gap: "16px",
            fontSize: "11px",
            color: "var(--color-text-tertiary)",
          }}
        >
          <span>Pool {formatCUSDT(totalPool)} cUSDT</span>
        </div>
      </div>
    </div>
  );
};
