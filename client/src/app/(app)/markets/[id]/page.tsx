"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import {
  FHEBadge,
  LockIcon,
  IconChevronLeft,
  IconFlame,
  IconClock,
  IconCheck,
  IconShield,
} from "@/components/shared/Icons";
import { OddsBar } from "@/components/shared/OddsBar";
import { EncryptedValue } from "@/components/shared/EncryptedValue";

/* ── Demo data ────────────────────────────────────────────────── */

interface MarketDetail {
  id: string;
  q: string;
  category: string;
  yes: number;
  no: number;
  pool: number;
  volume24h: number;
  expiry: string;
  expiryBlocks: number;
  bets: number;
  trend: number;
  hot: boolean;
  history: number[];
  description: string;
  oracle: string;
  resolver: string;
  creator: string;
  fee: string;
  minStake: string;
  reputation: string;
}

const MARKETS: Record<string, MarketDetail> = {
  "btc-120k": {
    id: "btc-120k",
    q: "Will BTC exceed $120K by June 2026?",
    category: "Crypto",
    yes: 67,
    no: 33,
    pool: 48200,
    volume24h: 12400,
    expiry: "Jun 30, 2026",
    expiryBlocks: 891200,
    bets: 342,
    trend: 5,
    hot: true,
    history: [42, 45, 48, 51, 55, 53, 58, 62, 60, 64, 67, 65],
    description:
      "This market resolves YES if the price of Bitcoin (BTC) exceeds $120,000 USD on any major exchange (Binance, Coinbase, Kraken) at any point before June 30, 2026 23:59 UTC. Price is determined by the volume-weighted average price (VWAP) across at least two exchanges.",
    oracle: "Chainlink",
    resolver: "0x7f2c...4d91",
    creator: "0x4a2c...9f1e",
    fee: "2.0%",
    minStake: "5 cUSDT",
    reputation: ">= 40",
  },
  "gpt6-2026": {
    id: "gpt6-2026",
    q: "Will OpenAI release GPT-6 before 2027?",
    category: "Tech",
    yes: 54,
    no: 46,
    pool: 31500,
    volume24h: 8900,
    expiry: "Dec 31, 2026",
    expiryBlocks: 1223400,
    bets: 218,
    trend: 3,
    hot: true,
    history: [50, 52, 49, 53, 51, 55, 54, 52, 56, 54, 53, 54],
    description:
      "Resolves YES if OpenAI publicly announces and releases a model explicitly branded as GPT-6 (or the next major version successor) before December 31, 2026 23:59 UTC.",
    oracle: "Chainlink",
    resolver: "0x7f2c...4d91",
    creator: "0x88d1...c2b4",
    fee: "2.0%",
    minStake: "5 cUSDT",
    reputation: ">= 40",
  },
  "eth-etf-flows": {
    id: "eth-etf-flows",
    q: "Will ETH ETF net inflows exceed $10B in 2026?",
    category: "Crypto",
    yes: 41,
    no: 59,
    pool: 22800,
    volume24h: 5600,
    expiry: "Dec 31, 2026",
    expiryBlocks: 1223400,
    bets: 156,
    trend: -2,
    hot: false,
    history: [55, 52, 48, 50, 46, 44, 42, 45, 43, 41, 40, 41],
    description:
      "Resolves YES if the cumulative net inflows into all US-listed spot Ethereum ETFs exceed $10 billion USD by December 31, 2026 23:59 UTC.",
    oracle: "Chainlink",
    resolver: "0x7f2c...4d91",
    creator: "0xff01...ae20",
    fee: "2.0%",
    minStake: "5 cUSDT",
    reputation: ">= 40",
  },
  "sb-2026-niners": {
    id: "sb-2026-niners",
    q: "Will the 49ers win Super Bowl LXI?",
    category: "Sports",
    yes: 18,
    no: 82,
    pool: 15400,
    volume24h: 3200,
    expiry: "Feb 8, 2027",
    expiryBlocks: 1280000,
    bets: 89,
    trend: 0,
    hot: false,
    history: [20, 19, 21, 18, 17, 19, 18, 20, 19, 18, 17, 18],
    description:
      "Resolves YES if the San Francisco 49ers win Super Bowl LXI. The result is determined by the official NFL outcome.",
    oracle: "Chainlink",
    resolver: "0x7f2c...4d91",
    creator: "0x4a2c...9f1e",
    fee: "2.0%",
    minStake: "5 cUSDT",
    reputation: ">= 40",
  },
  "fed-cut-q2": {
    id: "fed-cut-q2",
    q: "Will the Fed cut rates in Q2 2026?",
    category: "Macro",
    yes: 72,
    no: 28,
    pool: 38600,
    volume24h: 9800,
    expiry: "Jun 30, 2026",
    expiryBlocks: 891200,
    bets: 274,
    trend: 4,
    hot: true,
    history: [58, 60, 63, 61, 65, 68, 66, 70, 69, 72, 71, 72],
    description:
      "Resolves YES if the Federal Reserve announces a federal funds rate cut at any FOMC meeting during Q2 2026 (April 1 - June 30).",
    oracle: "Chainlink",
    resolver: "0x7f2c...4d91",
    creator: "0x88d1...c2b4",
    fee: "2.0%",
    minStake: "5 cUSDT",
    reputation: ">= 40",
  },
  "solana-flip": {
    id: "solana-flip",
    q: "Will Solana flip Ethereum in TVL by 2027?",
    category: "Crypto",
    yes: 23,
    no: 77,
    pool: 19200,
    volume24h: 4100,
    expiry: "Dec 31, 2026",
    expiryBlocks: 1223400,
    bets: 132,
    trend: -3,
    hot: false,
    history: [30, 28, 26, 29, 25, 24, 27, 25, 23, 24, 22, 23],
    description:
      "Resolves YES if Solana total value locked (TVL) exceeds Ethereum TVL according to DefiLlama at any point before December 31, 2026.",
    oracle: "Chainlink",
    resolver: "0x7f2c...4d91",
    creator: "0xff01...ae20",
    fee: "2.0%",
    minStake: "5 cUSDT",
    reputation: ">= 40",
  },
  "ai-hardware-ipo": {
    id: "ai-hardware-ipo",
    q: "Will a major AI chip startup IPO in 2026?",
    category: "Markets",
    yes: 61,
    no: 39,
    pool: 27400,
    volume24h: 7300,
    expiry: "Dec 31, 2026",
    expiryBlocks: 1223400,
    bets: 198,
    trend: 2,
    hot: false,
    history: [48, 50, 52, 55, 53, 57, 56, 58, 60, 59, 62, 61],
    description:
      "Resolves YES if any AI hardware company (Cerebras, Groq, SambaNova, etc.) with a pre-IPO valuation above $5B completes an IPO on a US exchange in 2026.",
    oracle: "Chainlink",
    resolver: "0x7f2c...4d91",
    creator: "0x4a2c...9f1e",
    fee: "2.0%",
    minStake: "5 cUSDT",
    reputation: ">= 40",
  },
  "tsla-split": {
    id: "tsla-split",
    q: "Will Tesla announce another stock split in 2026?",
    category: "Markets",
    yes: 35,
    no: 65,
    pool: 11800,
    volume24h: 2100,
    expiry: "Dec 31, 2026",
    expiryBlocks: 1223400,
    bets: 74,
    trend: -1,
    hot: false,
    history: [40, 38, 36, 39, 37, 35, 38, 36, 34, 36, 35, 35],
    description:
      "Resolves YES if Tesla, Inc. (TSLA) announces a stock split of any ratio during 2026.",
    oracle: "Chainlink",
    resolver: "0x7f2c...4d91",
    creator: "0x88d1...c2b4",
    fee: "2.0%",
    minStake: "5 cUSDT",
    reputation: ">= 40",
  },
};

interface Activity {
  side: "YES" | "NO";
  bettor: string;
  time: string;
}

const ACTIVITY: Activity[] = [
  { side: "YES", bettor: "0x4a2c...9f1e", time: "2 blocks ago" },
  { side: "NO", bettor: "0x88d1...c2b4", time: "5 blocks ago" },
  { side: "YES", bettor: "0xff01...ae20", time: "7 blocks ago" },
  { side: "YES", bettor: "0x12ab...3c4d", time: "11 blocks ago" },
  { side: "NO", bettor: "0xde91...7f2a", time: "14 blocks ago" },
  { side: "YES", bettor: "0x9c3e...a1b8", time: "19 blocks ago" },
  { side: "NO", bettor: "0x6d4f...e5c2", time: "22 blocks ago" },
  { side: "YES", bettor: "0x2b8a...d9f0", time: "28 blocks ago" },
];

const TIME_RANGES = ["1D", "7D", "30D", "ALL"];

/* ── Chart component ──────────────────────────────────────────── */

function OddsChart({
  data,
  timeRange,
  onTimeRangeChange,
}: {
  data: number[];
  timeRange: string;
  onTimeRangeChange: (range: string) => void;
}) {
  const w = 560;
  const h = 200;
  const px = 40;
  const py = 20;
  const cw = w - px * 2;
  const ch = h - py * 2;

  const gridLines = [0, 25, 50, 75, 100];

  const points = data.map((val, i) => {
    const x = px + (i / (data.length - 1)) * cw;
    const y = py + ch - (val / 100) * ch;
    return { x, y };
  });

  const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");

  const lastPoint = points[points.length - 1];

  const areaD = `${pathD} L${lastPoint.x},${py + ch} L${px},${py + ch} Z`;

  return (
    <div>
      <svg
        width="100%"
        viewBox={`0 0 ${w} ${h}`}
        style={{ display: "block" }}
      >
        <defs>
          <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-accent)" stopOpacity="0.2" />
            <stop offset="100%" stopColor="var(--color-accent)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {gridLines.map((pct) => {
          const y = py + ch - (pct / 100) * ch;
          return (
            <g key={pct}>
              <line
                x1={px}
                y1={y}
                x2={w - px}
                y2={y}
                stroke="var(--color-chart-grid)"
                strokeWidth="1"
              />
              <text
                x={px - 8}
                y={y + 4}
                textAnchor="end"
                fill="var(--color-text-tertiary)"
                fontSize="10"
                fontFamily="var(--font-mono)"
              >
                {pct}%
              </text>
            </g>
          );
        })}

        {/* Area fill */}
        <path d={areaD} fill="url(#chartGrad)" />

        {/* Line */}
        <path
          d={pathD}
          fill="none"
          stroke="var(--color-chart-line)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Animated endpoint dot */}
        <circle
          cx={lastPoint.x}
          cy={lastPoint.y}
          r="4"
          fill="var(--color-accent)"
          stroke="var(--color-bg-surface)"
          strokeWidth="2"
        >
          <animate
            attributeName="r"
            values="4;6;4"
            dur="2s"
            repeatCount="indefinite"
          />
        </circle>
        <circle
          cx={lastPoint.x}
          cy={lastPoint.y}
          r="8"
          fill="none"
          stroke="var(--color-accent)"
          strokeWidth="1"
          opacity="0.3"
        >
          <animate
            attributeName="r"
            values="8;14;8"
            dur="2s"
            repeatCount="indefinite"
          />
          <animate
            attributeName="opacity"
            values="0.3;0;0.3"
            dur="2s"
            repeatCount="indefinite"
          />
        </circle>
      </svg>

      {/* Time range chips */}
      <div
        style={{
          display: "flex",
          gap: "4px",
          marginTop: "12px",
        }}
      >
        {TIME_RANGES.map((range) => (
          <button
            key={range}
            className={`chip${range === timeRange ? " chip--active" : ""}`}
            onClick={() => onTimeRangeChange(range)}
            type="button"
            style={{ fontSize: "11px", padding: "4px 10px" }}
          >
            {range}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ── Main page ────────────────────────────────────────────────── */

export default function MarketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const market = MARKETS[id];

  const [side, setSide] = useState<"YES" | "NO">("YES");
  const [amount, setAmount] = useState("100");
  const [timeRange, setTimeRange] = useState("30D");
  const [betPlaced, setBetPlaced] = useState(false);
  const [positionRevealed, setPositionRevealed] = useState(false);

  /* Live odds simulation */
  const [liveYes, setLiveYes] = useState(market?.yes ?? 50);
  const [liveNo, setLiveNo] = useState(market?.no ?? 50);
  const [pulsing, setPulsing] = useState(false);

  useEffect(() => {
    if (!market) return;
    const interval = setInterval(() => {
      const delta = (Math.random() - 0.5) * 4;
      const newYes = Math.max(5, Math.min(95, liveYes + delta));
      const newNo = 100 - newYes;
      setLiveYes(Math.round(newYes));
      setLiveNo(Math.round(newNo));
      setPulsing(true);
      setTimeout(() => setPulsing(false), 700);
    }, 4500);
    return () => clearInterval(interval);
  }, [market, liveYes]);

  if (!market) {
    return (
      <div
        className="container"
        style={{
          paddingTop: "80px",
          textAlign: "center",
          color: "var(--color-text-tertiary)",
        }}
      >
        <p style={{ fontSize: "var(--text-lg)", marginBottom: "12px" }}>
          Market not found
        </p>
        <Link href="/markets" className="btn btn-secondary">
          <IconChevronLeft size={14} />
          Back to Markets
        </Link>
      </div>
    );
  }

  const amountNum = parseFloat(amount) || 0;
  const yesPct = liveYes;
  const noPct = liveNo;
  const selectedPct = side === "YES" ? yesPct : noPct;
  const multiplier = selectedPct > 0 ? (100 / selectedPct).toFixed(2) : "0.00";
  const payout = (amountNum * parseFloat(multiplier)).toFixed(2);
  const profit = (parseFloat(payout) - amountNum).toFixed(2);

  const handlePlaceBet = () => {
    setBetPlaced(true);
    setTimeout(() => setBetPlaced(false), 5000);
  };

  const quickAmounts = [25, 50, 100, 250];

  return (
    <div className="container" style={{ paddingTop: "32px", paddingBottom: "80px" }}>
      <div className="detail-grid">
        {/* ── Left column ─────────────────────────────────────── */}
        <div>
          {/* Back button */}
          <Link
            href="/markets"
            className="btn btn-ghost"
            style={{ marginBottom: "20px", display: "inline-flex" }}
          >
            <IconChevronLeft size={14} />
            Back to Markets
          </Link>

          {/* Pills row */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              flexWrap: "wrap",
              marginBottom: "16px",
            }}
          >
            <span className="pill">{market.category}</span>
            {market.hot && (
              <span className="pill pill-warning">
                <IconFlame size={11} stroke="var(--color-warning-text)" />
                Hot
              </span>
            )}
            <FHEBadge />
            <span
              className="pill"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <IconClock size={11} />
              {market.expiry}
            </span>
            <span
              className="mono"
              style={{
                fontSize: "var(--text-xs)",
                color: "var(--color-text-tertiary)",
              }}
            >
              ID: {market.id}
            </span>
          </div>

          {/* Question */}
          <h1
            className="display"
            style={{
              fontSize: "var(--text-xl)",
              fontWeight: 700,
              letterSpacing: "-0.03em",
              marginBottom: "28px",
              lineHeight: "var(--leading-snug)",
            }}
          >
            {market.q}
          </h1>

          {/* OddsBar card */}
          <div
            className="card card-elevated"
            style={{ marginBottom: "28px", padding: "20px 24px" }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "14px",
              }}
            >
              <span
                style={{
                  fontSize: "var(--text-sm)",
                  fontWeight: 600,
                  color: "var(--color-text-secondary)",
                }}
              >
                Current Odds
              </span>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  fontSize: "var(--text-xs)",
                  color: "var(--color-accent-bright)",
                  fontFamily: "var(--font-mono)",
                }}
              >
                <span className="live-dot" />
                Live
              </span>
            </div>
            <OddsBar
              yes={liveYes}
              no={liveNo}
              large
              pool={market.pool}
              lastUpdate="Updated live"
              pulsing={pulsing}
            />
          </div>

          {/* Odds chart */}
          <div className="card" style={{ marginBottom: "28px" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "16px",
              }}
            >
              <span
                style={{
                  fontSize: "var(--text-sm)",
                  fontWeight: 600,
                  color: "var(--color-text-secondary)",
                }}
              >
                Odds History
              </span>
            </div>
            <OddsChart
              data={market.history}
              timeRange={timeRange}
              onTimeRangeChange={setTimeRange}
            />
          </div>

          {/* Resolution rules */}
          <div className="card" style={{ marginBottom: "28px" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                marginBottom: "16px",
              }}
            >
              <IconShield size={16} stroke="var(--color-text-secondary)" />
              <span
                style={{
                  fontSize: "var(--text-sm)",
                  fontWeight: 600,
                  color: "var(--color-text-secondary)",
                }}
              >
                Resolution Rules
              </span>
            </div>
            <p
              style={{
                fontSize: "var(--text-sm)",
                color: "var(--color-text-secondary)",
                lineHeight: "var(--leading-normal)",
                marginBottom: "20px",
              }}
            >
              {market.description}
            </p>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                gap: "12px",
              }}
            >
              {[
                { label: "Oracle", value: market.oracle },
                { label: "Resolver", value: market.resolver, mono: true },
                { label: "Creator", value: market.creator, mono: true },
                { label: "Fee", value: market.fee },
                { label: "Min stake", value: market.minStake },
                { label: "Reputation", value: market.reputation },
              ].map((item) => (
                <div key={item.label}>
                  <div
                    style={{
                      fontSize: "10px",
                      fontFamily: "var(--font-mono)",
                      color: "var(--color-text-tertiary)",
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      marginBottom: "4px",
                    }}
                  >
                    {item.label}
                  </div>
                  <div
                    className={item.mono ? "mono" : ""}
                    style={{
                      fontSize: "var(--text-sm)",
                      color: "var(--color-text-primary)",
                    }}
                  >
                    {item.value}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Activity table */}
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ padding: "20px 20px 0" }}>
              <span
                style={{
                  fontSize: "var(--text-sm)",
                  fontWeight: 600,
                  color: "var(--color-text-secondary)",
                }}
              >
                Recent Activity
              </span>
            </div>
            <table className="table" style={{ marginTop: "12px" }}>
              <thead>
                <tr>
                  <th>Side</th>
                  <th>Bettor</th>
                  <th>Amount</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {ACTIVITY.map((a, i) => (
                  <tr key={i}>
                    <td>
                      <span
                        className={`pill ${a.side === "YES" ? "pill-yes" : "pill-no"}`}
                      >
                        {a.side}
                      </span>
                    </td>
                    <td>
                      <span className="mono" style={{ fontSize: "var(--text-sm)" }}>
                        {a.bettor}
                      </span>
                    </td>
                    <td>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                          color: "var(--color-privacy-text)",
                          fontSize: "var(--text-sm)",
                        }}
                      >
                        <LockIcon size={12} />
                        <span
                          className="mono"
                          style={{ letterSpacing: "0.12em" }}
                        >
                          {"\u2022\u2022\u2022\u2022\u2022"}
                        </span>
                      </span>
                    </td>
                    <td>
                      <span
                        className="mono"
                        style={{
                          fontSize: "var(--text-xs)",
                          color: "var(--color-text-tertiary)",
                        }}
                      >
                        {a.time}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Right column (sticky betting panel) ─────────────── */}
        <div style={{ position: "sticky", top: "80px", alignSelf: "start" }}>
          <div className="card" style={{ padding: "24px" }}>
            {/* Header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "20px",
              }}
            >
              <span
                className="display"
                style={{ fontSize: "var(--text-md)", fontWeight: 700 }}
              >
                Place bet
              </span>
              <FHEBadge />
            </div>

            {/* YES / NO side buttons */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "10px",
                marginBottom: "20px",
              }}
            >
              <button
                className={`side-btn${side === "YES" ? " side-btn--yes-active" : ""}`}
                onClick={() => setSide("YES")}
                type="button"
              >
                <div
                  style={{
                    fontSize: "var(--text-base)",
                    fontWeight: 700,
                    color:
                      side === "YES"
                        ? "var(--color-yes-text)"
                        : "var(--color-text-primary)",
                  }}
                >
                  YES
                </div>
                <div
                  className="mono"
                  style={{
                    fontSize: "var(--text-xs)",
                    color: "var(--color-text-tertiary)",
                  }}
                >
                  {yesPct}% &middot; {yesPct > 0 ? (100 / yesPct).toFixed(1) : "0.0"}x
                </div>
              </button>
              <button
                className={`side-btn${side === "NO" ? " side-btn--no-active" : ""}`}
                onClick={() => setSide("NO")}
                type="button"
              >
                <div
                  style={{
                    fontSize: "var(--text-base)",
                    fontWeight: 700,
                    color:
                      side === "NO"
                        ? "var(--color-no-text)"
                        : "var(--color-text-primary)",
                  }}
                >
                  NO
                </div>
                <div
                  className="mono"
                  style={{
                    fontSize: "var(--text-xs)",
                    color: "var(--color-text-tertiary)",
                  }}
                >
                  {noPct}% &middot; {noPct > 0 ? (100 / noPct).toFixed(1) : "0.0"}x
                </div>
              </button>
            </div>

            {/* Amount input */}
            <div style={{ marginBottom: "12px" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "var(--text-xs)",
                  fontFamily: "var(--font-mono)",
                  color: "var(--color-text-tertiary)",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  marginBottom: "6px",
                }}
              >
                Amount
              </label>
              <div style={{ position: "relative" }}>
                <input
                  className="input input-mono"
                  type="text"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  style={{ paddingRight: "60px" }}
                />
                <span
                  className="mono"
                  style={{
                    position: "absolute",
                    right: "14px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    fontSize: "var(--text-xs)",
                    color: "var(--color-text-tertiary)",
                  }}
                >
                  cUSDT
                </span>
              </div>
            </div>

            {/* Quick amount chips */}
            <div
              style={{
                display: "flex",
                gap: "6px",
                marginBottom: "20px",
              }}
            >
              {quickAmounts.map((qa) => (
                <button
                  key={qa}
                  className={`chip${amount === String(qa) ? " chip--active" : ""}`}
                  onClick={() => setAmount(String(qa))}
                  type="button"
                  style={{ flex: 1, textAlign: "center", fontSize: "12px" }}
                >
                  {qa}
                </button>
              ))}
            </div>

            {/* Payout breakdown */}
            <div
              style={{
                background: "var(--color-bg-input)",
                borderRadius: "var(--radius-md)",
                padding: "16px",
                marginBottom: "20px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "8px",
                }}
              >
                <span
                  style={{
                    fontSize: "var(--text-sm)",
                    color: "var(--color-text-tertiary)",
                  }}
                >
                  Stake
                </span>
                <span
                  className="mono"
                  style={{ fontSize: "var(--text-sm)" }}
                >
                  {amountNum.toLocaleString()} cUSDT
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "12px",
                }}
              >
                <span
                  style={{
                    fontSize: "var(--text-sm)",
                    color: "var(--color-text-tertiary)",
                  }}
                >
                  Odds multiplier
                </span>
                <span
                  className="mono"
                  style={{ fontSize: "var(--text-sm)" }}
                >
                  {multiplier}x
                </span>
              </div>
              <div
                style={{
                  height: "1px",
                  background: "var(--color-border-subtle)",
                  marginBottom: "12px",
                }}
              />
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "6px",
                }}
              >
                <span
                  style={{
                    fontSize: "var(--text-sm)",
                    fontWeight: 600,
                    color: "var(--color-text-secondary)",
                  }}
                >
                  Payout if correct
                </span>
                <span
                  className="mono"
                  style={{
                    fontSize: "var(--text-sm)",
                    fontWeight: 600,
                  }}
                >
                  {parseFloat(payout).toLocaleString()} cUSDT
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                }}
              >
                <span
                  style={{
                    fontSize: "var(--text-sm)",
                    color: "var(--color-text-tertiary)",
                  }}
                >
                  Profit
                </span>
                <span
                  className="mono"
                  style={{
                    fontSize: "var(--text-sm)",
                    color:
                      side === "YES"
                        ? "var(--color-yes-text)"
                        : "var(--color-no-text)",
                    fontWeight: 600,
                  }}
                >
                  +{parseFloat(profit).toLocaleString()} cUSDT
                </span>
              </div>
            </div>

            {/* Submit button */}
            <button
              className={`btn btn-lg ${side === "YES" ? "btn-yes" : "btn-no"}`}
              onClick={handlePlaceBet}
              type="button"
              style={{
                width: "100%",
                marginBottom: "16px",
                fontSize: "14px",
              }}
            >
              <LockIcon
                size={14}
                stroke={
                  side === "YES"
                    ? "var(--color-yes-text)"
                    : "var(--color-no-text)"
                }
              />
              Encrypt & Bet {side} &middot; {amountNum}
            </button>

            {/* Privacy notice */}
            <div
              style={{
                background: "var(--color-yes-muted)",
                borderRadius: "var(--radius-md)",
                padding: "12px 14px",
                display: betPlaced ? "block" : "none",
                marginBottom: "16px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  fontSize: "var(--text-sm)",
                  color: "var(--color-yes-text)",
                  fontWeight: 600,
                  marginBottom: "4px",
                }}
              >
                <IconCheck size={14} stroke="var(--color-yes-text)" />
                Bet placed successfully
              </div>
              <p
                style={{
                  fontSize: "var(--text-xs)",
                  color: "var(--color-text-tertiary)",
                  lineHeight: "var(--leading-normal)",
                }}
              >
                Your {side} position of {amountNum} cUSDT has been encrypted and
                recorded on-chain.
              </p>
            </div>

            <div
              style={{
                background: "var(--color-privacy-muted)",
                borderRadius: "var(--radius-md)",
                padding: "12px 14px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "8px",
                }}
              >
                <LockIcon
                  size={13}
                  stroke="var(--color-privacy-text)"
                  style={{ marginTop: "2px", flexShrink: 0 }}
                />
                <p
                  style={{
                    fontSize: "var(--text-xs)",
                    color: "var(--color-privacy-text)",
                    lineHeight: "var(--leading-normal)",
                  }}
                >
                  Your amount is encrypted client-side using FHE before
                  submission. No one -- not even the contract owner -- can see
                  individual bet amounts. Only aggregate pool totals are
                  publicly decryptable.
                </p>
              </div>
            </div>

            {/* Your position (shown if bet placed) */}
            {betPlaced && (
              <div
                style={{
                  marginTop: "20px",
                  borderTop: "1px solid var(--color-border-subtle)",
                  paddingTop: "20px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: "14px",
                  }}
                >
                  <span
                    style={{
                      fontSize: "var(--text-sm)",
                      fontWeight: 600,
                      color: "var(--color-text-secondary)",
                    }}
                  >
                    Your position
                  </span>
                  <span
                    className={`pill ${side === "YES" ? "pill-yes" : "pill-no"}`}
                  >
                    {side}
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: "8px",
                  }}
                >
                  <span
                    style={{
                      fontSize: "var(--text-xs)",
                      color: "var(--color-text-tertiary)",
                    }}
                  >
                    Entry odds
                  </span>
                  <span
                    className="mono"
                    style={{ fontSize: "var(--text-sm)" }}
                  >
                    {selectedPct}%
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span
                    style={{
                      fontSize: "var(--text-xs)",
                      color: "var(--color-text-tertiary)",
                    }}
                  >
                    Amount
                  </span>
                  <EncryptedValue
                    value={amountNum}
                    revealed={positionRevealed}
                    onReveal={() => setPositionRevealed(true)}
                    size="sm"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
