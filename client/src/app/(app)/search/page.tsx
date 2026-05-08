"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useFactoryMarkets } from "@/hooks/useFactory";
import { useMarket } from "@/hooks/useMarket";
import { OddsBar } from "@/components/nc/OddsBar";
import { EmptyState } from "@/components/nc/EmptyState";
import { Search as SearchIcon } from "lucide-react";

function MarketSearchCard({ address, index, query }: { address: `0x${string}`; index: number; query: string }) {
  const { question, yesOdds, totalPool, category, isLoading, isOddsLoading } = useMarket(address);

  if (isLoading || !question) return null;

  // Filter by search query
  if (query) {
    const needle = query.toLowerCase();
    const matchesQ = question.toLowerCase().includes(needle) || (category ?? "").toLowerCase().includes(needle);
    if (!matchesQ) return null;
  }

  const poolStr = totalPool >= 1_000 ? `$${(totalPool / 1_000).toFixed(1)}k` : `$${totalPool.toFixed(0)}`;

  return (
    <Link href={`/markets/${index}`}
      className="card-etched p-5 flex flex-col gap-4 hover:bg-surface-2/30 transition-colors group">
      <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-wider text-fg-3">
        <span className="text-primary">{category ?? "Other"}</span>
      </div>
      <h3 className="font-display text-base leading-snug text-fg group-hover:text-primary transition-colors">
        {question}
      </h3>
      <div className="flex items-end justify-between">
        <div>
          <div className="font-mono tnum text-2xl text-yes">{isOddsLoading ? "..." : `${yesOdds}%`}</div>
          <div className="font-mono text-[10px] uppercase tracking-wider text-fg-3 mt-0.5">YES</div>
        </div>
      </div>
      {!isOddsLoading && <OddsBar yes={yesOdds} showLabels={false} height={4} />}
      <div className="font-mono text-[11px] text-fg-3 flex items-center gap-2 pt-2 border-t border-subtle">
        <span className="text-fg-2 tnum">{poolStr}</span><span>pool</span>
      </div>
    </Link>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-8 sm:py-10 text-fg-3">Loading search...</div>}>
      <SearchContent />
    </Suspense>
  );
}

function SearchContent() {
  const [query, setQuery] = useState("");
  const { allMarkets, isLoading } = useFactoryMarkets();

  return (
    <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-8 sm:py-10">
      <span className="section-numeral text-xl sm:text-2xl">§ Search</span>
      <h1 className="font-display text-3xl sm:text-4xl text-fg mt-1 mb-6">Find a table</h1>

      <div className="relative">
        <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-fg-3 pointer-events-none" />
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search markets, categories…"
          className="w-full h-14 pl-11 pr-4 rounded border border-subtle bg-surface-1 focus:border-strong focus:outline-none font-display text-lg text-fg placeholder:text-fg-3"
        />
      </div>

      <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-fg-3 mt-4 mb-3">
        {allMarkets.length} markets
        {query && <span className="ml-2 text-fg-2">filtering for &quot;{query}&quot;</span>}
      </div>

      {isLoading ? (
        <div className="py-16 text-center text-fg-3 text-sm">Loading markets...</div>
      ) : allMarkets.length === 0 ? (
        <EmptyState title="No markets yet" body="Markets will appear here once they are created." />
      ) : (
        <div className="grid sm:grid-cols-2 gap-px">
          {allMarkets.map((addr, i) => (
            <MarketSearchCard key={addr} address={addr} index={i} query={query} />
          ))}
        </div>
      )}
    </div>
  );
}
