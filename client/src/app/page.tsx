"use client";

import { useState } from "react";
import Link from "next/link";
import { useReadContract } from "wagmi";
import { Icon } from "@/components/shared/Icons";
import { PulseDot } from "@/components/shared/PulseDot";
import { nullCastFactoryConfig, vaultFactoryConfig } from "@/lib/contracts";

/* ── Stat component ───────────────────────────────────────── */
function Stat({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string | number;
  tone?: "default" | "gold" | "yes" | "no";
}) {
  const color =
    tone === "yes"
      ? "var(--yes)"
      : tone === "no"
        ? "var(--no)"
        : tone === "gold"
          ? "var(--gold)"
          : "var(--ink-1)";
  return (
    <div>
      <div
        className="mono"
        style={{
          fontSize: 34,
          color,
          fontWeight: 500,
          lineHeight: 1.1,
          letterSpacing: "-0.02em",
        }}
      >
        {value}
      </div>
      <div
        style={{
          marginTop: 6,
          fontSize: 10,
          color: "var(--ink-3)",
          letterSpacing: "0.12em",
          textTransform: "uppercase",
        }}
      >
        {label}
      </div>
    </div>
  );
}

/* ── Live stats from on-chain ────────────────────────────── */
function useProtocolStats() {
  const { data: marketCount } = useReadContract({
    ...nullCastFactoryConfig,
    functionName: "getMarketCount",
  });

  const { data: vaultCount } = useReadContract({
    ...vaultFactoryConfig,
    functionName: "getVaultCount",
  });

  return {
    markets: marketCount ? Number(marketCount) : 0,
    vaults: vaultCount ? Number(vaultCount) : 0,
  };
}

/* ── Ticker data ──────────────────────────────────────────── */
const TICKER_MARKETS = [
  { q: "Will ETH surpass $5,000 by Q3 2026?", yes: 66, trend: 2.1 },
  { q: "Bitcoin above $120K by year end?", yes: 42, trend: -1.4 },
  { q: "Fed cuts rates before September?", yes: 71, trend: 0.8 },
  { q: "Solana flips Ethereum in TVL?", yes: 18, trend: -3.2 },
  { q: "Apple launches crypto wallet?", yes: 34, trend: 1.1 },
  { q: "US stablecoin bill passes 2026?", yes: 58, trend: 0 },
];

/* ── LiveTicker ───────────────────────────────────────────── */
function LiveTicker() {
  const items = TICKER_MARKETS;
  const doubled = [...items, ...items];
  return (
    <div
      style={{
        borderTop: "1px solid var(--line)",
        borderBottom: "1px solid var(--line)",
        overflow: "hidden",
        padding: "14px 0",
        background: "var(--bg-1)",
        position: "relative",
      }}
    >
      <div className="ticker-track">
        {doubled.map((m, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              padding: "0 28px",
              borderRight: "1px solid var(--line)",
              whiteSpace: "nowrap",
              minWidth: 340,
            }}
          >
            <span
              className="serif"
              style={{
                fontSize: 15,
                color: "var(--ink-1)",
                fontStyle: "italic",
              }}
            >
              {m.q}
            </span>
            <span
              className="mono"
              style={{ fontSize: 12, color: "var(--yes)" }}
            >
              {m.yes}%
            </span>
            <span
              className="mono"
              style={{
                fontSize: 11,
                color:
                  m.trend > 0
                    ? "var(--yes)"
                    : m.trend < 0
                      ? "var(--no)"
                      : "var(--ink-3)",
              }}
            >
              {m.trend > 0 ? "\u25B2" : m.trend < 0 ? "\u25BC" : "\u00B7"}{" "}
              {Math.abs(m.trend).toFixed(1)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── LandingPage ──────────────────────────────────────────── */
export default function LandingPage() {
  const [hoverTrade, setHoverTrade] = useState(false);
  const stats = useProtocolStats();

  return (
    <div
      className="page-in"
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Hero */}
      <section
        style={{
          maxWidth: 1280,
          width: "100%",
          margin: "0 auto",
          padding: "120px 48px 80px",
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
        }}
      >
        <div style={{ maxWidth: 900 }}>
          {/* Eyebrow */}
          <div
            className="mono"
            style={{
              fontSize: 10,
              color: "var(--gold)",
              letterSpacing: "0.28em",
              textTransform: "uppercase",
              marginBottom: 28,
            }}
          >
            <span style={{ marginRight: 10 }}>&mdash;</span>
            Prediction markets, private by default
          </div>

          {/* Headline */}
          <h1
            className="serif"
            style={{
              fontSize: "clamp(48px, 7vw, 92px)",
              lineHeight: 1.02,
              letterSpacing: "-0.025em",
              fontWeight: 500,
              color: "var(--ink-1)",
              textWrap: "balance",
            }}
          >
            The house can&rsquo;t see <br />
            <em
              style={{
                color: "var(--gold)",
                fontStyle: "italic",
                fontWeight: 400,
              }}
            >
              your cards.
            </em>
          </h1>

          {/* Subtitle — mentions all features */}
          <p
            style={{
              marginTop: 28,
              fontSize: 17,
              color: "var(--ink-2)",
              maxWidth: 620,
              lineHeight: 1.55,
            }}
          >
            Encrypted positions on Zama fhEVM &mdash; no one sees your side or size.
            Copy top predictors through strategy vaults, earn reputation to unlock
            premium markets, and provide liquidity to earn fees. All with full privacy.
          </p>

          {/* Buttons */}
          <div style={{ display: "flex", gap: 10, marginTop: 44 }}>
            <Link
              href="/markets"
              style={{
                padding: "13px 22px",
                background: hoverTrade ? "#E6B95A" : "var(--gold)",
                color: "#1A1511",
                borderRadius: 4,
                fontSize: 13,
                fontWeight: 500,
                letterSpacing: "0.01em",
                display: "flex",
                alignItems: "center",
                gap: 8,
                transition: "background 200ms, transform 200ms",
                textDecoration: "none",
              }}
              onMouseEnter={() => setHoverTrade(true)}
              onMouseLeave={() => setHoverTrade(false)}
            >
              Trade now{" "}
              <Icon name="arrow-right" size={13} color="#1A1511" />
            </Link>
            <Link
              href="/vaults"
              style={{
                padding: "13px 22px",
                border: "1px solid var(--line-2)",
                borderRadius: 4,
                color: "var(--ink-1)",
                fontSize: 13,
                textDecoration: "none",
              }}
            >
              Copy strategies
            </Link>
          </div>
        </div>

        {/* Stats bar — real on-chain data */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 40,
            marginTop: 110,
            paddingTop: 40,
            borderTop: "1px solid var(--line)",
            maxWidth: 900,
          }}
        >
          <Stat label="Live markets" value={stats.markets || "..."} />
          <Stat label="Strategy vaults" value={stats.vaults || "..."} />
          <Stat label="Encryption" value="FHE" tone="gold" />
          <Stat label="Network" value="Sepolia" />
        </div>
      </section>

      {/* Live ticker marquee */}
      <div>
        <div
          style={{
            maxWidth: 1280,
            margin: "0 auto",
            padding: "0 48px 10px",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <PulseDot color="var(--yes)" />
          <span
            className="mono"
            style={{
              fontSize: 10,
              color: "var(--ink-3)",
              letterSpacing: "0.2em",
              textTransform: "uppercase",
            }}
          >
            Live markets
          </span>
        </div>
        <LiveTicker />
      </div>
    </div>
  );
}
