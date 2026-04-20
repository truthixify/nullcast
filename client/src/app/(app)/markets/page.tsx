"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useBlockNumber } from "wagmi";
import { useFactoryMarkets } from "@/hooks/useFactory";
import { useMarket } from "@/hooks/useMarket";
import { OddsBar } from "@/components/shared/OddsBar";
import { GlowCard } from "@/components/shared/GlowCard";

function fmtExpiry(expiryBlock: bigint | undefined, currentBlock: bigint | undefined): string {
  if (!expiryBlock) return "--";
  if (!currentBlock) return `Block ${expiryBlock.toString()}`;
  const diff = Number(expiryBlock) - Number(currentBlock);
  if (diff <= 0) return "Expired";
  const seconds = diff * 12;
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  if (days > 30) return `${Math.floor(days / 30)}mo ${days % 30}d`;
  if (days > 0) return `${days}d ${hours}h`;
  return `${hours}h ${Math.floor((seconds % 3600) / 60)}m`;
}

/* ── Constants ────────────────────────────────────────────── */

const STATUS_TABS = ["Active", "Resolved", "All"] as const;
const SORT_OPTIONS = ["Pool size", "Bets", "Ending soon"] as const;
const CATEGORY_OPTIONS = [
  "All",
  "CRYPTO",
  "MACRO",
  "EQUITY",
  "SPORTS",
  "TECH",
  "OTHER",
] as const;

const STATUS_MAP: Record<string, number | null> = {
  Active: 0,
  Resolved: 3,
  All: null,
};

const formatCUSDT = (value: number): string => {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

/* ── MarketCard (inline) ──────────────────────────────────── */

function MarketCard({
  address,
  onClick,
}: {
  address: `0x${string}`;
  onClick: () => void;
}) {
  const { data: currentBlock } = useBlockNumber();
  const {
    question,
    status,
    expiryBlock,
    totalPool,
    yesOdds,
    noOdds,
    isLoading,
  } = useMarket(address, { refetchInterval: 30_000 });

  if (isLoading) {
    return (
      <div
        className="glow-card"
        style={{
          padding: "22px 26px",
          minHeight: 100,
        }}
      >
        <div
          className="skel"
          style={{ width: "60%", height: 18, marginBottom: 14 }}
        />
        <div className="skel" style={{ width: "100%", height: 10, marginBottom: 10 }} />
        <div style={{ display: "flex", gap: 18 }}>
          <div className="skel" style={{ width: 80, height: 12 }} />
          <div className="skel" style={{ width: 60, height: 12 }} />
          <div className="skel" style={{ width: 70, height: 12 }} />
        </div>
      </div>
    );
  }

  const statusNum = typeof status === "number" ? status : 0;
  const resolved = statusNum === 3;
  const isHot = totalPool >= 100_000;

  return (
    <GlowCard
      onClick={onClick}
      className="shimmer"
      style={{
        padding: "22px 26px",
        cursor: "pointer",
        width: "100%",
      }}
    >
      {/* Question + hot indicator */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 24,
          marginBottom: 18,
        }}
      >
        <h3
          className="serif"
          style={{
            fontSize: 18,
            fontWeight: 500,
            letterSpacing: "-0.01em",
            lineHeight: 1.3,
            color: resolved ? "var(--ink-2)" : "var(--ink-1)",
            flex: 1,
            margin: 0,
          }}
        >
          {question ?? "Loading..."}
        </h3>
        {isHot && !resolved && (
          <span
            className="mono"
            style={{
              fontSize: 10,
              color: "var(--gold)",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              whiteSpace: "nowrap",
              opacity: 0.9,
            }}
          >
            &#9679; hot
          </span>
        )}
      </div>

      {/* Odds bar */}
      <div style={{ marginBottom: 14 }}>
        <OddsBar yes={yesOdds} no={noOdds} size="md" muted={resolved} />
      </div>

      {/* Stats row */}
      <div
        className="mono"
        style={{
          display: "flex",
          gap: 18,
          fontSize: 11,
          color: "var(--ink-3)",
          alignItems: "center",
        }}
      >
        <span>{formatCUSDT(totalPool)} pool</span>
        <span style={{ color: "var(--ink-4)" }}>&middot;</span>
        <span>
          {fmtExpiry(expiryBlock, currentBlock ?? undefined)}
        </span>
        {resolved && (
          <>
            <span style={{ color: "var(--ink-4)" }}>&middot;</span>
            <span style={{ color: "var(--yes)" }}>
              Resolved YES
            </span>
          </>
        )}
      </div>
    </GlowCard>
  );
}

/* ── MarketFilterData ─────────────────────────────────────── */

function MarketFilterData({
  address,
  children,
}: {
  address: `0x${string}`;
  children: (data: {
    status: number | undefined;
    question: string | undefined;
    category: string | undefined;
  }) => React.ReactNode;
}) {
  const { status, question, category } = useMarket(address, { refetchInterval: 30_000 });
  return <>{children({ status, question, category })}</>;
}

/* ── MarketsPage ──────────────────────────────────────────── */

export default function MarketsPage() {
  const router = useRouter();
  const { allMarkets, isLoading } = useFactoryMarkets();
  const [status, setStatus] = useState<(typeof STATUS_TABS)[number]>("Active");
  const [sort, setSort] = useState<(typeof SORT_OPTIONS)[number]>("Pool size");
  const [categoryFilter, setCategoryFilter] =
    useState<(typeof CATEGORY_OPTIONS)[number]>("All");

  /* Count showing (approximate from allMarkets length for now) */
  const showingCount = allMarkets.length;

  return (
    <div
      className="page-in"
      style={{
        maxWidth: 1280,
        margin: "0 auto",
        padding: "44px 48px 80px",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          marginBottom: 28,
        }}
      >
        <h1
          className="serif"
          style={{
            fontSize: 38,
            fontWeight: 500,
            letterSpacing: "-0.02em",
            margin: 0,
          }}
        >
          Markets
        </h1>
        <div
          className="mono"
          style={{ fontSize: 12, color: "var(--ink-3)" }}
        >
          {showingCount} showing
        </div>
      </div>

      {/* Status tabs -- underlined text */}
      <div
        style={{
          display: "flex",
          gap: 26,
          borderBottom: "1px solid var(--line)",
          marginBottom: 20,
        }}
      >
        {STATUS_TABS.map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            type="button"
            style={{
              padding: "10px 0",
              fontSize: 13,
              color: status === s ? "var(--ink-1)" : "var(--ink-3)",
              borderBottom:
                status === s
                  ? "1px solid var(--gold)"
                  : "1px solid transparent",
              marginBottom: -1,
              background: "none",
              border: "none",
              borderBottomWidth: 1,
              borderBottomStyle: "solid",
              borderBottomColor:
                status === s ? "var(--gold)" : "transparent",
              cursor: "pointer",
            }}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Category pills + sort */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 20,
          marginBottom: 36,
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 6,
            overflowX: "auto",
            flex: 1,
          }}
        >
          {CATEGORY_OPTIONS.map((c) => (
            <button
              key={c}
              onClick={() => setCategoryFilter(c)}
              type="button"
              style={{
                padding: "6px 12px",
                fontSize: 12,
                borderRadius: 100,
                border: `1px solid ${categoryFilter === c ? "var(--line-hot)" : "var(--line)"}`,
                color:
                  categoryFilter === c ? "var(--ink-1)" : "var(--ink-2)",
                background:
                  categoryFilter === c ? "var(--bg-2)" : "transparent",
                whiteSpace: "nowrap",
                transition: "all 160ms ease",
                cursor: "pointer",
              }}
            >
              {c}
            </button>
          ))}
        </div>
        <div style={{ position: "relative" }}>
          <select
            value={sort}
            onChange={(e) =>
              setSort(e.target.value as (typeof SORT_OPTIONS)[number])
            }
            style={{
              appearance: "none",
              fontFamily: "var(--f-body)",
              padding: "6px 26px 6px 10px",
              fontSize: 12,
              border: "1px solid var(--line)",
              borderRadius: 3,
              color: "var(--ink-2)",
              background: "var(--bg-1)",
              cursor: "pointer",
            }}
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
          <span
            style={{
              position: "absolute",
              right: 10,
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--ink-3)",
              fontSize: 9,
              pointerEvents: "none",
            }}
          >
            &#9660;
          </span>
        </div>
      </div>

      {/* Loading skeletons */}
      {isLoading && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="glow-card"
              style={{ padding: "22px 26px", minHeight: 100 }}
            >
              <div
                className="skel"
                style={{ width: "60%", height: 18, marginBottom: 14 }}
              />
              <div
                className="skel"
                style={{ width: "100%", height: 10, marginBottom: 10 }}
              />
              <div style={{ display: "flex", gap: 18 }}>
                <div className="skel" style={{ width: 80, height: 12 }} />
                <div className="skel" style={{ width: 60, height: 12 }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Market cards -- vertical list */}
      {!isLoading && allMarkets.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {allMarkets.map((address, index) => (
            <MarketFilterData key={address} address={address}>
              {({
                status: mStatus,
                category: mCategory,
              }) => {
                const statusFilter = STATUS_MAP[status];

                if (
                  statusFilter !== null &&
                  mStatus !== undefined &&
                  mStatus !== statusFilter
                ) {
                  return null;
                }

                if (
                  categoryFilter !== "All" &&
                  mCategory &&
                  mCategory.toUpperCase() !== categoryFilter
                ) {
                  return null;
                }

                return (
                  <MarketCard
                    address={address}
                    onClick={() => router.push(`/markets/${index}`)}
                  />
                );
              }}
            </MarketFilterData>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && allMarkets.length === 0 && (
        <div
          style={{
            textAlign: "center",
            padding: "80px 0",
            color: "var(--ink-3)",
          }}
        >
          <p
            className="serif"
            style={{ fontSize: 22, marginBottom: 8 }}
          >
            No markets found
          </p>
          <p style={{ fontSize: 14, color: "var(--ink-4)" }}>
            Be the first to create a prediction market.
          </p>
        </div>
      )}
    </div>
  );
}
