"use client";

/**
 * TickerRail — CRT-style scrolling market ticker fixed to bottom of app frame.
 * Lives below all routes inside AppLayout.
 */
import Link from "next/link";
import { MARKETS, formatUSD } from "@/data/markets";

export const TickerRail = () => {
  const items = [...MARKETS, ...MARKETS, ...MARKETS];
  return (
    <div className="border-t border-subtle bg-[hsl(var(--surface-1))]/80 backdrop-blur-xl overflow-hidden hidden sm:block">
      <div className="flex items-center h-9">
        {/* Static label */}
        <div className="shrink-0 px-4 h-full flex items-center gap-2 border-r border-subtle bg-surface-2/50">
          <span className="live-dot" />
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-fg-3">Live</span>
        </div>

        {/* Scrolling content */}
        <div className="flex-1 overflow-hidden relative">
          <div className="flex animate-marquee whitespace-nowrap will-change-transform">
            {items.map((m, i) => {
              const up = m.history[m.history.length - 1].yes >= m.history[0].yes;
              return (
                <Link
                  key={i}
                  href={`/markets/${m.id}`}
                  className="flex items-center gap-2.5 px-5 text-xs hover:text-fg transition-colors"
                >
                  <span className="font-mono text-[10px] text-fg-4 tnum">
                    {m.id.split("-")[0].toUpperCase().slice(0, 4)}
                  </span>
                  <span className="font-display text-fg-2 max-w-[200px] truncate">{m.question}</span>
                  <span className={`font-mono tnum ${up ? "text-yes" : "text-no"}`}>
                    {up ? "▲" : "▼"} {m.yesOdds}%
                  </span>
                  <span className="font-mono text-fg-4 tnum">{formatUSD(m.pool)}</span>
                  <span className="text-fg-4 mx-1">|</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
