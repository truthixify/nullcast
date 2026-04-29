"use client";

import Link from "next/link";
import { ACTIVITY, MARKETS } from "@/data/markets";
import { EmptyState } from "@/components/nc/EmptyState";
import { Button } from "@/components/ui/button";
import { PullToRefresh } from "@/components/nc/PullToRefresh";
import { sealed } from "@/lib/notify";

export default function ActivityPage() {
  if (ACTIVITY.length === 0) {
    return (
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-10">
        <EmptyState
          title="The table is quiet"
          body="No sealed actions in the last hour. The chain catches up fast."
          action={<Button asChild variant="primary"><Link href="/markets">Open a market</Link></Button>}
        />
      </div>
    );
  }

  const refresh = async () => {
    await new Promise((r) => setTimeout(r, 700));
    sealed("Stream refreshed");
  };

  return (
    <PullToRefresh onRefresh={refresh}>
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-8 sm:py-10">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8 sm:mb-10">
          <div>
            <span className="section-numeral text-xl sm:text-2xl">§ Activity</span>
            <h1 className="font-display text-3xl sm:text-4xl text-fg mt-1">The table speaks</h1>
            <p className="mt-2 text-fg-3 font-display max-w-xl text-sm sm:text-base">
              Every encrypted bet, every settlement, every reveal — streaming live from the chain.
            </p>
          </div>
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-fg-3 flex items-center gap-2 shrink-0">
            <span className="live-dot" /> Streaming · sealed
          </span>
        </div>

        {/* Desktop table */}
        <div className="hidden md:block border border-subtle rounded overflow-hidden">
          <div className="grid grid-cols-12 gap-4 px-4 py-2.5 font-mono text-[10px] uppercase tracking-wider text-fg-3 border-b border-subtle bg-surface-1/40">
            <div className="col-span-1">Side</div>
            <div className="col-span-6">Market</div>
            <div className="col-span-2">Trader</div>
            <div className="col-span-2">Amount</div>
            <div className="col-span-1 text-right">Time</div>
          </div>
          <div className="divide-y divide-[hsl(var(--border)/0.06)]">
            {[...ACTIVITY, ...ACTIVITY, ...ACTIVITY].map((a, i) => {
              const m = MARKETS[i % MARKETS.length];
              return (
                <Link
                  key={i}
                  href={`/markets/${m.id}`}
                  className="grid grid-cols-12 gap-4 px-4 py-3 items-center text-xs hover:bg-surface-2/40 transition-colors animate-fade-in"
                  style={{ animationDelay: `${i * 20}ms` }}
                >
                  <div className="col-span-1 flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: a.side === "YES" ? "hsl(var(--yes))" : "hsl(var(--no))" }} />
                    <span className="font-mono text-fg-2">{a.side}</span>
                  </div>
                  <div className="col-span-6 font-display text-fg truncate">{m.question}</div>
                  <div className="col-span-2 font-mono text-fg-3">{a.who}</div>
                  <div className="col-span-2 font-mono text-fg-4">●●●●●●●●</div>
                  <div className="col-span-1 font-mono text-fg-3 text-right">{a.time}</div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Mobile list */}
        <div className="md:hidden space-y-px">
          {[...ACTIVITY, ...ACTIVITY].map((a, i) => {
            const m = MARKETS[i % MARKETS.length];
            return (
              <Link
                key={i}
                href={`/markets/${m.id}`}
                className="flex items-start gap-3 p-3 border-b border-subtle/60 animate-fade-in"
                style={{ animationDelay: `${i * 20}ms` }}
              >
                <span
                  className="h-6 w-6 rounded border border-subtle flex items-center justify-center font-mono text-[10px] mt-0.5 shrink-0"
                  style={{
                    color: a.side === "YES" ? "hsl(var(--yes))" : "hsl(var(--no))",
                    background: a.side === "YES" ? "hsl(var(--yes)/0.06)" : "hsl(var(--no)/0.06)",
                  }}
                >
                  {a.side === "YES" ? "Y" : "N"}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="font-display text-sm text-fg leading-tight line-clamp-2">{m.question}</div>
                  <div className="mt-1 font-mono text-[10px] text-fg-3 flex items-center gap-2">
                    <span>{a.who}</span>
                    <span className="text-fg-4">·</span>
                    <span className="text-fg-4">●●●●●●</span>
                  </div>
                </div>
                <span className="font-mono text-[10px] text-fg-3 shrink-0">{a.time}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </PullToRefresh>
  );
}
