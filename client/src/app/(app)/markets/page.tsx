"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useBlockNumber } from "wagmi";
import { useFactoryMarkets } from "@/hooks/useFactory";
import { useMarket } from "@/hooks/useMarket";
import { GlowCard } from "@/components/nc/GlowCard";
import { OddsBar } from "@/components/nc/OddsBar";
import { EmptyState } from "@/components/nc/EmptyState";
import { LayoutGrid, Rows3, Flame } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const STATUS_TABS = ["Active", "Resolved", "All"] as const;

const CATEGORY_OPTIONS = ["All", "CRYPTO", "MACRO", "EQUITY", "SPORTS", "TECH", "OTHER"] as const;
const STATUS_MAP: Record<string, number | null> = { Active: 0, Resolved: 3, All: null };

const SUITS: Record<string, string> = {
  All: "✦", CRYPTO: "♠", MACRO: "♦", EQUITY: "♣", SPORTS: "♥", TECH: "✶", OTHER: "❖",
};

function fmtExpiry(expiryBlock: bigint | undefined, currentBlock: bigint | undefined): string {
  if (!expiryBlock) return "--";
  if (!currentBlock) return `Block ${expiryBlock.toString()}`;
  const diff = Number(expiryBlock) - Number(currentBlock);
  if (diff <= 0) return "Expired";
  const seconds = diff * 12;
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  if (days > 30) return `${Math.floor(days / 30)}mo`;
  if (days > 0) return `${days}d`;
  return `${hours}h`;
}

const formatCUSDT = (value: number): string => {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}k`;
  return `$${value.toFixed(2)}`;
};

function MarketCard({ address, index }: { address: `0x${string}`; index: number }) {
  const router = useRouter();
  const { data: currentBlock } = useBlockNumber();
  const { question, status, expiryBlock, totalPool, yesOdds, isLoading, isOddsLoading, category } = useMarket(address);

  if (isLoading) {
    return (
      <div className="card-etched p-6 space-y-4">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-2 w-full" />
        <div className="flex gap-4">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-3 w-16" />
        </div>
      </div>
    );
  }

  const statusNum = typeof status === "number" ? status : 0;
  const resolved = statusNum === 3;
  const isHot = totalPool >= 100_000;

  return (
    <div className="block animate-rise relative">
      <GlowCard className="p-6 h-full flex flex-col gap-5 cursor-pointer" onClick={() => router.push(`/markets/${index}`)}>
        <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-wider text-fg-3">
          <span className="flex items-center gap-1.5">
            <span className="suit text-primary text-sm">{SUITS[category?.toUpperCase() ?? "OTHER"] ?? "❖"}</span>
            {category ?? "Other"}
            {isHot && !resolved && (
              <span className="ml-1 inline-flex items-center gap-0.5 text-primary">
                <Flame className="h-2.5 w-2.5" /> hot
              </span>
            )}
          </span>
          <span className="tnum">{fmtExpiry(expiryBlock, currentBlock ?? undefined)}</span>
        </div>

        <h3 className="font-display text-[18px] leading-snug text-fg min-h-[3rem]">
          {question ?? "Loading..."}
        </h3>

        <div className="flex items-end justify-between -my-1">
          <div>
            <div className="font-mono tnum text-3xl text-yes">
              {isOddsLoading ? "..." : `${yesOdds}%`}
            </div>
            <div className="font-mono text-[10px] uppercase tracking-wider text-fg-3 mt-0.5">YES odds</div>
          </div>
        </div>

        {!isOddsLoading && (
          <OddsBar yes={yesOdds} resolved={resolved} showLabels={false} height={6} />
        )}

        <div className="font-mono text-[11px] text-fg-3 flex items-center gap-2 mt-auto pt-2 border-t border-subtle">
          <span className="text-fg-2">{formatCUSDT(totalPool)}</span>
          <span>pool</span>
          {resolved && (
            <>
              <span className="mx-1.5 text-fg-4">·</span>
              <span className="text-yes">Resolved</span>
            </>
          )}
        </div>
      </GlowCard>
    </div>
  );
}

function MarketFilterData({
  address,
  children,
}: {
  address: `0x${string}`;
  children: (data: { status: number | undefined; category: string | undefined }) => React.ReactNode;
}) {
  const { status, category } = useMarket(address);
  return <>{children({ status, category })}</>;
}

export default function MarketsPage() {
  const { allMarkets, isLoading } = useFactoryMarkets();
  const [status, setStatus] = useState<(typeof STATUS_TABS)[number]>("Active");
  const [categoryFilter, setCategoryFilter] = useState<(typeof CATEGORY_OPTIONS)[number]>("All");
  const [view, setView] = useState<"cards" | "table">("cards");

  return (
    <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-8 sm:py-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 sm:gap-6 mb-2">
        <div>
          <span className="section-numeral text-xl sm:text-2xl">§ Markets</span>
          <h1 className="font-display text-3xl sm:text-4xl text-fg mt-1">Open tables</h1>
        </div>
        <div className="flex items-center gap-4 sm:gap-6 text-sm overflow-x-auto no-scrollbar">
          {STATUS_TABS.map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={`pb-2 transition-colors border-b whitespace-nowrap ${
                status === s ? "border-primary text-fg" : "border-transparent text-fg-3 hover:text-fg-2"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-6 border-b border-subtle">
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar -mx-1 px-1">
          {CATEGORY_OPTIONS.map((c) => (
            <button
              key={c}
              onClick={() => setCategoryFilter(c)}
              className={`px-3 h-7 rounded-full text-xs whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                categoryFilter === c ? "bg-surface-3 text-fg" : "text-fg-3 hover:text-fg-2"
              }`}
            >
              <span className={`suit text-[13px] ${categoryFilter === c ? "text-primary" : ""}`}>{SUITS[c] ?? "✦"}</span>
              {c}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <span className="font-mono text-[11px] text-fg-3">{allMarkets.length} markets</span>
          <div className="flex items-center border border-subtle rounded">
            <button
              onClick={() => setView("cards")}
              className={`p-1.5 transition-colors ${view === "cards" ? "bg-surface-2 text-fg" : "text-fg-3 hover:text-fg-2"}`}
              aria-label="Grid view"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setView("table")}
              className={`p-1.5 transition-colors ${view === "table" ? "bg-surface-2 text-fg" : "text-fg-3 hover:text-fg-2"}`}
              aria-label="Table view"
            >
              <Rows3 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-px mt-6">
          {[0, 1, 2].map((i) => (
            <div key={i} className="card-etched p-6 space-y-4">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-2 w-full" />
              <div className="flex gap-4">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Markets */}
      {!isLoading && allMarkets.length > 0 && (
        <div className={view === "cards" ? "grid sm:grid-cols-2 xl:grid-cols-3 gap-px mt-6" : "flex flex-col gap-2 mt-6"}>
          {allMarkets.map((address, index) => (
            <MarketFilterData key={address} address={address}>
              {({ status: mStatus, category: mCategory }) => {
                const statusFilter = STATUS_MAP[status];
                if (statusFilter !== null && mStatus !== undefined && mStatus !== statusFilter) return null;
                if (categoryFilter !== "All" && mCategory && mCategory.toUpperCase() !== categoryFilter) return null;
                return <MarketCard address={address} index={index} />;
              }}
            </MarketFilterData>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && allMarkets.length === 0 && (
        <EmptyState
          title="No tables open"
          body="Be the first to create a prediction market."
        />
      )}
    </div>
  );
}
