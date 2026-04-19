"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useFactoryMarkets } from "@/hooks/useFactory";
import { useMarket } from "@/hooks/useMarket";
import { SegmentedControl } from "@/components/shared/SegmentedControl";
import { MarketCard } from "@/components/shared/MarketCard";

import {
  IconSearch,
  IconPlus,
  LockIcon,
} from "@/components/shared/Icons";

const STATUS_OPTIONS = ["Open", "Resolved", "All"];

const STATUS_MAP: Record<string, number | null> = {
  Open: 0,
  Resolved: 3,
  All: null,
};

/**
 * Wrapper that reads on-chain status for a single market address so the
 * list page can filter by status and search by question text.
 */
function MarketFilterData({
  address,
  children,
}: {
  address: `0x${string}`;
  children: (data: { status: number | undefined; question: string | undefined }) => React.ReactNode;
}) {
  const { status, question } = useMarket(address);
  return <>{children({ status, question })}</>;
}

export default function MarketsPage() {
  const router = useRouter();
  const { marketCount, allMarkets, isLoading } = useFactoryMarkets();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("Open");

  return (
    <div className="container" style={{ paddingTop: "48px", paddingBottom: "80px" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          marginBottom: "32px",
        }}
      >
        <div>
          <h1
            className="display"
            style={{
              fontSize: "var(--text-2xl)",
              fontWeight: 700,
              letterSpacing: "-0.04em",
              marginBottom: "8px",
            }}
          >
            Markets
          </h1>
          <p
            className="mono"
            style={{
              fontSize: "var(--text-sm)",
              color: "var(--color-text-tertiary)",
              display: "flex",
              alignItems: "center",
              gap: "10px",
            }}
          >
            <span>{marketCount} market{marketCount !== 1 ? "s" : ""}</span>
            <span
              style={{
                width: "2px",
                height: "2px",
                borderRadius: "50%",
                background: "var(--color-text-tertiary)",
              }}
            />
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                color: "var(--color-privacy-text)",
              }}
            >
              <LockIcon size={11} stroke="var(--color-privacy-text)" />
              encrypted via FHE
            </span>
          </p>
        </div>
        <Link href="/markets/create" className="btn btn-primary btn-lg">
          <IconPlus size={14} />
          Create Market
        </Link>
      </div>

      {/* Filter bar */}
      <div
        className="card"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "16px",
          flexWrap: "wrap",
          marginBottom: "24px",
          padding: "16px 20px",
        }}
      >
        {/* Search */}
        <div className="nc-search" style={{ width: "220px", flexShrink: 0 }}>
          <IconSearch size={14} stroke="var(--color-text-tertiary)" />
          <input
            type="text"
            placeholder="Search markets..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Status segmented control */}
        <SegmentedControl
          options={STATUS_OPTIONS}
          value={status}
          onChange={setStatus}
          small
        />
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="markets-grid">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="card market-card"
              style={{ minHeight: "180px" }}
            >
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--color-text-tertiary)",
                  fontSize: "var(--text-sm)",
                }}
              >
                Loading markets...
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Markets grid */}
      {!isLoading && allMarkets.length > 0 && (
        <div className="markets-grid">
          {allMarkets.map((address, index) => (
            <MarketFilterData key={address} address={address}>
              {({ status: mStatus, question }) => {
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

      {/* Empty state — no markets deployed */}
      {!isLoading && allMarkets.length === 0 && (
        <div
          style={{
            textAlign: "center",
            padding: "80px 0",
            color: "var(--color-text-tertiary)",
          }}
        >
          <p style={{ fontSize: "var(--text-lg)", marginBottom: "8px" }}>
            No markets found
          </p>
          <p style={{ fontSize: "var(--text-sm)" }}>
            Be the first to create a prediction market.
          </p>
        </div>
      )}
    </div>
  );
}
