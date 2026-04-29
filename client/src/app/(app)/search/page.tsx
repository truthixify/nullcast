"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { MARKETS, formatUSD, type Category } from "@/data/markets";
import { Sparkline } from "@/components/nc/Sparkline";
import { OddsBar } from "@/components/nc/OddsBar";
import { EmptyState } from "@/components/nc/EmptyState";
import { Search as SearchIcon } from "lucide-react";

const CATS: (Category | "All")[] = ["All", "Crypto", "Macro", "AI", "Politics", "Space", "Sports"];

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-8 sm:py-10 text-fg-3">Loading search...</div>}>
      <SearchContent />
    </Suspense>
  );
}

function SearchContent() {
  const searchParams = useSearchParams();
  const q = searchParams.get("q") ?? "";
  const cat = (searchParams.get("cat") as Category | "All") ?? "All";
  const [draft, setDraft] = useState(q);

  const results = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return MARKETS.filter((m) => {
      const matchesCat = cat === "All" || m.category === cat;
      const matchesQ = !needle ||
        m.question.toLowerCase().includes(needle) ||
        m.description.toLowerCase().includes(needle) ||
        m.category.toLowerCase().includes(needle);
      return matchesCat && matchesQ;
    });
  }, [q, cat]);

  const [activeCat, setActiveCat] = useState<Category | "All">(cat);

  const filteredResults = useMemo(() => {
    if (activeCat === "All") return results;
    return results.filter((m) => m.category === activeCat);
  }, [results, activeCat]);

  return (
    <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-8 sm:py-10">
      <span className="section-numeral text-xl sm:text-2xl">§ Search</span>
      <h1 className="font-display text-3xl sm:text-4xl text-fg mt-1 mb-6">Find a table</h1>

      {/* Search bar */}
      <div className="relative">
        <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-fg-3 pointer-events-none" />
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Search markets, oracles, categories…"
          className="w-full h-14 pl-11 pr-4 rounded border border-subtle bg-surface-1 focus:border-strong focus:outline-none font-display text-lg text-fg placeholder:text-fg-3"
        />
      </div>

      {/* Category filters */}
      <div className="flex items-center gap-1 mt-4 mb-6 overflow-x-auto no-scrollbar -mx-1 px-1">
        {CATS.map((c) => (
          <button key={c} onClick={() => setActiveCat(c)}
            className={`px-3 h-7 rounded-full text-xs whitespace-nowrap transition-colors ${
              activeCat === c ? "bg-surface-3 text-fg" : "text-fg-3 hover:text-fg-2"
            }`}>
            {c}
          </button>
        ))}
      </div>

      <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-fg-3 mb-3">
        {filteredResults.length} {filteredResults.length === 1 ? "result" : "results"}
        {draft && <span className="ml-2 text-fg-2">for &quot;{draft}&quot;</span>}
      </div>

      {filteredResults.length === 0 ? (
        <EmptyState title="No tables match" body="Try a different keyword or clear the category filter." />
      ) : (
        <div className="grid sm:grid-cols-2 gap-px">
          {filteredResults.map((m) => (
            <Link key={m.id} href={`/markets/${m.id}`}
              className="card-etched p-5 flex flex-col gap-4 hover:bg-surface-2/30 transition-colors group">
              <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-wider text-fg-3">
                <span className="text-primary">{m.category}</span>
                <span>{m.expiresIn}</span>
              </div>
              <h3 className="font-display text-base leading-snug text-fg group-hover:text-primary transition-colors">
                {m.question}
              </h3>
              <div className="flex items-end justify-between">
                <div>
                  <div className="font-mono tnum text-2xl text-yes">{m.yesOdds}%</div>
                  <div className="font-mono text-[10px] uppercase tracking-wider text-fg-3 mt-0.5">YES</div>
                </div>
                <Sparkline data={m.history.map((h) => h.yes)} width={100} height={32}
                  stroke="hsl(var(--yes))" fill="hsl(var(--yes) / 0.10)" />
              </div>
              <OddsBar yes={m.yesOdds} resolved={m.status === "Resolved"} showLabels={false} height={4} />
              <div className="font-mono text-[11px] text-fg-3 flex items-center gap-2 pt-2 border-t border-subtle">
                <span className="text-fg-2 tnum">{formatUSD(m.pool)}</span><span>pool</span>
                <span className="mx-1.5 text-fg-4">·</span>
                <span className="text-fg-2 tnum">{m.bets.toLocaleString()}</span><span>bets</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
