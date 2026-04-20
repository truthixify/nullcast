"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useFactoryMarkets } from "@/hooks/useFactory";
import { useMarket } from "@/hooks/useMarket";
import { OddsBar } from "@/components/shared/OddsBar";
import {
  IconSearch,
  IconPlus,
  FHEBadge,
} from "@/components/shared/Icons";

/* ── Constants ────────────────────────────────────────────── */

const STATUS_OPTIONS = ["Open", "Resolved", "All"] as const;
const SORT_OPTIONS = ["Volume", "Newest", "Expiry"] as const;
const CATEGORY_OPTIONS = ["All", "CRYPTO", "MACRO", "EQUITY", "SPORTS", "TECH", "OTHER"] as const;

const STATUS_MAP: Record<string, number | null> = {
  Open: 0,
  Resolved: 3,
  All: null,
};

const STATUS_LABELS: Record<number, string> = {
  0: "Open",
  1: "Expired",
  2: "Resolving",
  3: "Resolved",
  4: "Cancelled",
};

const STATUS_PILL: Record<number, string> = {
  0: "pill open",
  1: "pill expired",
  2: "pill expired",
  3: "pill resolved",
  4: "pill cancelled",
};

const formatCUSDT = (value: number): string => {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

/* ── MarketCard (inline) ──────────────────────────────────── */

function MarketCard({ address, onClick }: { address: `0x${string}`; onClick: () => void }) {
  const {
    question,
    status,
    marketType,
    expiryBlock,
    totalPool,
    yesOdds,
    noOdds,
    category,
    isLoading,
  } = useMarket(address);

  if (isLoading) {
    return (
      <div className="card" style={{ padding: 20, minHeight: 200 }}>
        <div className="row between" style={{ marginBottom: 14 }}>
          <div className="skel" style={{ width: 56, height: 20 }} />
          <div className="skel" style={{ width: 80, height: 16 }} />
        </div>
        <div className="skel" style={{ width: "100%", height: 18, marginBottom: 8 }} />
        <div className="skel" style={{ width: "60%", height: 18, marginBottom: 18 }} />
        <div className="skel" style={{ width: "100%", height: 6, marginBottom: 14 }} />
        <div className="row between" style={{ borderTop: "1px solid var(--border-1)", paddingTop: 12 }}>
          <div className="skel" style={{ width: 80, height: 14 }} />
          <div className="skel" style={{ width: 50, height: 14 }} />
        </div>
      </div>
    );
  }

  const statusNum = typeof status === "number" ? status : 0;
  const typeLabel = marketType === 1 ? "Scalar" : "Binary";

  return (
    <div
      className="card inter"
      style={{ padding: 20, cursor: "pointer" }}
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
      {/* header: category pill + expiry + status */}
      <div className="row between" style={{ marginBottom: 12 }}>
        <div className="row gap-2">
          <span className="pill cat">{typeLabel}</span>
          {category && (
            <span className="pill" style={{ fontSize: 10, textTransform: "uppercase" }}>
              {category}
            </span>
          )}
          <span className="mono" style={{ fontSize: 11, color: "var(--t-3)" }}>
            Block {expiryBlock ? expiryBlock.toString() : "---"}
          </span>
        </div>
        <span className={STATUS_PILL[statusNum] ?? "pill"}>
          {STATUS_LABELS[statusNum] ?? "Unknown"}
        </span>
      </div>

      {/* question */}
      <p className="display" style={{ fontSize: 16, margin: 0, marginBottom: 14, color: "var(--t-1)" }}>
        {question ?? "Loading..."}
      </p>

      {/* odds bar */}
      <OddsBar yes={yesOdds} no={noOdds} size="sm" />

      {/* meta */}
      <div className="odds-meta">
        <span>Pool {formatCUSDT(totalPool)} cUSDT</span>
        <span className="live"><span className="d" />Live</span>
      </div>
    </div>
  );
}

/* ── MarketFilterData ─────────────────────────────────────── */

function MarketFilterData({
  address,
  children,
}: {
  address: `0x${string}`;
  children: (data: { status: number | undefined; question: string | undefined; category: string | undefined }) => React.ReactNode;
}) {
  const { status, question, category } = useMarket(address);
  return <>{children({ status, question, category })}</>;
}

/* ── MarketsPage ──────────────────────────────────────────── */

export default function MarketsPage() {
  const router = useRouter();
  const { marketCount, allMarkets, isLoading } = useFactoryMarkets();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("Open");
  const [sort, setSort] = useState("Volume");
  const [categoryFilter, setCategoryFilter] = useState<typeof CATEGORY_OPTIONS[number]>("All");

  return (
    <div className="container page">
      {/* Page head */}
      <div className="row between" style={{ marginBottom: 24 }}>
        <div className="page-head" style={{ padding: 0 }}>
          <h1>Markets</h1>
          <div className="sub row gap-2">
            <span className="mono">{marketCount} market{marketCount !== 1 ? "s" : ""}</span>
            <span style={{
              width: 3, height: 3, borderRadius: "50%",
              background: "var(--t-4)", display: "inline-block",
            }} />
            <FHEBadge />
          </div>
        </div>
        <Link href="/markets/create" className="btn primary lg">
          <IconPlus size={14} />
          Create market
        </Link>
      </div>

      {/* Filter bar */}
      <div className="card" style={{ padding: 12, marginBottom: 12 }}>
        <div className="row gap-4" style={{ flexWrap: "wrap" }}>
          {/* search */}
          <div className="input-row" style={{ width: 240, flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", paddingLeft: 12 }}>
              <IconSearch size={14} stroke="var(--t-3)" />
            </div>
            <input
              className="input"
              type="text"
              placeholder="Search markets..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: 8 }}
            />
            <div className="unit"><span className="kbd">/</span></div>
          </div>

          {/* spacer */}
          <div style={{ flex: 1 }} />

          {/* status seg */}
          <div className="seg">
            {STATUS_OPTIONS.map((opt) => (
              <button
                key={opt}
                className={opt === status ? "active" : ""}
                onClick={() => setStatus(opt)}
                type="button"
              >
                {opt}
              </button>
            ))}
          </div>

          {/* sort seg */}
          <div className="seg">
            {SORT_OPTIONS.map((opt) => (
              <button
                key={opt}
                className={opt === sort ? "active" : ""}
                onClick={() => setSort(opt)}
                type="button"
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Category filter chips */}
      <div className="row gap-2" style={{ marginBottom: 24, flexWrap: "wrap" }}>
        {CATEGORY_OPTIONS.map((cat) => (
          <button
            key={cat}
            type="button"
            className={`btn sm ${categoryFilter === cat ? "primary" : "ghost"}`}
            onClick={() => setCategoryFilter(cat)}
            style={{ fontSize: 12 }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Loading skeletons */}
      {isLoading && (
        <div className="grid-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="card" style={{ padding: 20, minHeight: 200 }}>
              <div className="row between" style={{ marginBottom: 14 }}>
                <div className="skel" style={{ width: 56, height: 20 }} />
                <div className="skel" style={{ width: 80, height: 16 }} />
              </div>
              <div className="skel" style={{ width: "100%", height: 18, marginBottom: 8 }} />
              <div className="skel" style={{ width: "60%", height: 18, marginBottom: 18 }} />
              <div className="skel" style={{ width: "100%", height: 6 }} />
            </div>
          ))}
        </div>
      )}

      {/* Markets grid */}
      {!isLoading && allMarkets.length > 0 && (
        <div className="grid-3">
          {allMarkets.map((address, index) => (
            <MarketFilterData key={address} address={address}>
              {({ status: mStatus, question, category: mCategory }) => {
                const statusFilter = STATUS_MAP[status];

                if (statusFilter !== null && mStatus !== undefined && mStatus !== statusFilter) {
                  return null;
                }

                if (
                  search &&
                  question &&
                  !question.toLowerCase().includes(search.toLowerCase())
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
        <div style={{ textAlign: "center", padding: "80px 0", color: "var(--t-3)" }}>
          <p className="display" style={{ fontSize: 22, marginBottom: 8 }}>No markets found</p>
          <p style={{ fontSize: 14, color: "var(--t-4)" }}>Be the first to create a prediction market.</p>
        </div>
      )}
    </div>
  );
}
