"use client";

import { OddsBar } from "./OddsBar";
import { Sparkline } from "./Sparkline";
import { IconFlame, IconArrowUp, IconArrowDown, IconClock } from "./Icons";

interface Market {
  id: string;
  q: string;
  category: string;
  yes: number;
  no: number;
  pool: number;
  volume24h: number;
  expiry: string;
  bets: number;
  trend: number;
  hot: boolean;
  history: number[];
}

interface MarketCardProps {
  market: Market;
  onClick?: () => void;
}

export const MarketCard = ({ market, onClick }: MarketCardProps) => {
  const trendUp = market.trend > 0;
  const trendDown = market.trend < 0;

  const formatCompact = (n: number): string => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return n.toLocaleString();
  };

  return (
    <div
      className="card card-interactive market-card"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick?.();
        }
      }}
    >
      {/* Top row: category + expiry + hot/trend indicators */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "12px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span className="pill">{market.category}</span>
          {market.hot && (
            <span className="pill pill-warning">
              <IconFlame size={11} stroke="var(--color-warning-text)" />
              Hot
            </span>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          {(trendUp || trendDown) && (
            <span
              className={trendUp ? "pill pill-yes" : "pill pill-no"}
              style={{ display: "inline-flex", alignItems: "center", gap: "3px" }}
            >
              {trendUp ? (
                <IconArrowUp size={10} stroke="var(--color-yes-text)" />
              ) : (
                <IconArrowDown size={10} stroke="var(--color-no-text)" />
              )}
              {Math.abs(market.trend)}%
            </span>
          )}
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
            {market.expiry}
          </span>
        </div>
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
        {market.q}
      </h3>

      {/* Odds bar without meta */}
      <div style={{ marginBottom: "16px" }}>
        <OddsBar yes={market.yes} no={market.no} showMeta={false} />
      </div>

      {/* Stats row: pool, volume, bets, sparkline */}
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
          <span>Pool {formatCompact(market.pool)}</span>
          <span>Vol {formatCompact(market.volume24h)}</span>
          <span>{market.bets} bets</span>
        </div>
        {market.history.length >= 2 && (
          <Sparkline data={market.history} width={64} height={22} />
        )}
      </div>
    </div>
  );
};
