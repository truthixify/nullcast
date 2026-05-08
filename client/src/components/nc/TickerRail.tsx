"use client";

/**
 * TickerRail — scrolling market ticker fixed to bottom of app frame.
 * Uses real on-chain market data from the factory contract.
 */
import Link from "next/link";
import { useFactoryMarkets } from "@/hooks/useFactory";
import { useMarket } from "@/hooks/useMarket";

function TickerItem({ address, index }: { address: `0x${string}`; index: number }) {
  const { question, yesOdds, totalPool, isOddsLoading } = useMarket(address);
  if (!question) return null;

  const poolStr = totalPool >= 1_000 ? `$${(totalPool / 1_000).toFixed(1)}k` : `$${totalPool.toFixed(0)}`;

  return (
    <Link
      href={`/markets/${index}`}
      className="flex items-center gap-2.5 px-5 text-xs hover:text-fg transition-colors"
    >
      <span className="font-display text-fg-2 max-w-[200px] truncate">{question}</span>
      <span className="font-mono tnum text-yes">
        {isOddsLoading ? "..." : `${yesOdds}%`}
      </span>
      <span className="font-mono text-fg-4 tnum">{poolStr}</span>
      <span className="text-fg-4 mx-1">|</span>
    </Link>
  );
}

export const TickerRail = () => {
  const { allMarkets } = useFactoryMarkets();

  if (allMarkets.length === 0) return null;

  // Triple for seamless marquee loop
  const tripled = [...allMarkets, ...allMarkets, ...allMarkets];

  return (
    <div className="border-t border-subtle bg-[hsl(var(--surface-1))]/80 backdrop-blur-xl overflow-hidden hidden sm:block">
      <div className="flex items-center h-9">
        <div className="shrink-0 px-4 h-full flex items-center gap-2 border-r border-subtle bg-surface-2/50">
          <span className="live-dot" />
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-fg-3">Live</span>
        </div>

        <div className="flex-1 overflow-hidden relative">
          <div className="flex animate-marquee whitespace-nowrap will-change-transform">
            {tripled.map((addr, i) => (
              <TickerItem key={`${addr}-${i}`} address={addr} index={i % allMarkets.length} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
