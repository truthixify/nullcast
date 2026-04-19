"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SegmentedControl } from "@/components/shared/SegmentedControl";
import { MarketCard } from "@/components/shared/MarketCard";
import {
  IconSearch,
  IconPlus,
  LockIcon,
} from "@/components/shared/Icons";

interface DemoMarket {
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
}

const DEMO_MARKETS: DemoMarket[] = [
  {
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
  },
  {
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
  },
  {
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
  },
  {
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
  },
  {
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
  },
  {
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
  },
  {
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
  },
  {
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
  },
];

const CATEGORIES = ["All", "Crypto", "Tech", "Sports", "Macro", "Markets"];
const SORT_OPTIONS = ["Volume", "Hot", "Expiry"];
const STATUS_OPTIONS = ["Open", "Resolved", "All"];

export default function MarketsPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("Open");
  const [category, setCategory] = useState("All");
  const [sort, setSort] = useState("Volume");

  const filtered = DEMO_MARKETS.filter((m) => {
    if (category !== "All" && m.category !== category) return false;
    if (search && !m.q.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }).sort((a, b) => {
    if (sort === "Volume") return b.volume24h - a.volume24h;
    if (sort === "Hot") return (b.hot ? 1 : 0) - (a.hot ? 1 : 0) || b.volume24h - a.volume24h;
    if (sort === "Expiry") return a.expiryBlocks - b.expiryBlocks;
    return 0;
  });

  const totalPool = DEMO_MARKETS.reduce((sum, m) => sum + m.pool, 0);

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
            <span>{filtered.length} markets</span>
            <span
              style={{
                width: "2px",
                height: "2px",
                borderRadius: "50%",
                background: "var(--color-text-tertiary)",
              }}
            />
            <span>${totalPool.toLocaleString()} total pool</span>
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

        {/* Category chips */}
        <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              className={`chip${cat === category ? " chip--active" : ""}`}
              onClick={() => setCategory(cat)}
              type="button"
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Sort */}
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "6px" }}>
          <span
            style={{
              fontSize: "var(--text-xs)",
              color: "var(--color-text-tertiary)",
              fontFamily: "var(--font-mono)",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
            }}
          >
            Sort
          </span>
          <SegmentedControl
            options={SORT_OPTIONS}
            value={sort}
            onChange={setSort}
            small
          />
        </div>
      </div>

      {/* Markets grid */}
      <div className="markets-grid">
        {filtered.map((market) => (
          <MarketCard
            key={market.id}
            market={market}
            onClick={() => router.push(`/markets/${market.id}`)}
          />
        ))}
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
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
            Try adjusting your search or filters.
          </p>
        </div>
      )}
    </div>
  );
}
