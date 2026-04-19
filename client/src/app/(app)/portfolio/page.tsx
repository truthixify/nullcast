"use client";

import { useState } from "react";
import { EncryptedValue } from "@/components/shared/EncryptedValue";
import {
  LockIcon,
  IconEye,
  IconChevronRight,
  IconArrowUp,
  IconArrowDown,
  IconChart,
  IconClock,
} from "@/components/shared/Icons";

/* ── Local helper: StatCard ───────────────────────────────────── */
interface StatCardProps {
  label: string;
  value: string | number;
  valueColor?: string;
  mono?: boolean;
  encrypted?: boolean;
}

function StatCard({
  label,
  value,
  valueColor,
  mono = true,
  encrypted = false,
}: StatCardProps) {
  return (
    <div
      className="card"
      style={{ padding: 20 }}
    >
      <div
        style={{
          fontSize: 11,
          color: "var(--color-text-tertiary)",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          fontWeight: 500,
          marginBottom: 10,
        }}
      >
        {label}
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        <span
          className={mono ? "mono" : ""}
          style={{
            fontSize: 22,
            fontWeight: 600,
            color: valueColor || "var(--color-text-primary)",
          }}
        >
          {value}
        </span>
        {encrypted && (
          <LockIcon size={14} stroke="var(--color-privacy)" />
        )}
      </div>
    </div>
  );
}

/* ── Demo data ────────────────────────────────────────────────── */
interface ActivePosition {
  id: string;
  question: string;
  expiry: string;
  side: "YES" | "NO";
  amount: number;
  revealed: boolean;
  entry: number;
  current: number;
}

const activePositions: ActivePosition[] = [
  {
    id: "btc-120k",
    question: "Will BTC reach $120k by June 2026?",
    expiry: "Jun 30, 2026",
    side: "YES",
    amount: 250,
    revealed: false,
    entry: 61,
    current: 68,
  },
  {
    id: "eth-etf-flows",
    question: "ETH ETF net inflows exceed $10B by Q3?",
    expiry: "Sep 30, 2026",
    side: "YES",
    amount: 500,
    revealed: true,
    entry: 65,
    current: 73,
  },
  {
    id: "fed-cut-q2",
    question: "Will the Fed cut rates in Q2 2026?",
    expiry: "Jun 30, 2026",
    side: "NO",
    amount: 120,
    revealed: false,
    entry: 52,
    current: 54,
  },
  {
    id: "gpt6-2026",
    question: "GPT-6 released before end of 2026?",
    expiry: "Dec 31, 2026",
    side: "NO",
    amount: 80,
    revealed: false,
    entry: 43,
    current: 41,
  },
  {
    id: "solana-flip",
    question: "Solana flips Ethereum in daily txs by Q4?",
    expiry: "Dec 31, 2026",
    side: "NO",
    amount: 300,
    revealed: true,
    entry: 80,
    current: 82,
  },
];

interface SettledPosition {
  id: string;
  question: string;
  side: "YES" | "NO";
  stake: number;
  payout: number;
  result: "WON" | "LOST";
  date: string;
}

const settledPositions: SettledPosition[] = [
  {
    id: "eth-4500",
    question: "ETH reaches $4.5k by Feb 28",
    side: "YES",
    stake: 400,
    payout: 615,
    result: "WON",
    date: "Mar 1, 2026",
  },
  {
    id: "svb-failure",
    question: "SVB bank failure in Q1",
    side: "NO",
    stake: 150,
    payout: 241,
    result: "WON",
    date: "Apr 1, 2026",
  },
  {
    id: "apple-vp2",
    question: "Apple Vision Pro 2 announced",
    side: "YES",
    stake: 75,
    payout: 0,
    result: "LOST",
    date: "Mar 31, 2026",
  },
];

/* ── Portfolio page ───────────────────────────────────────────── */
export default function PortfolioPage() {
  const [activeTab, setActiveTab] = useState<"active" | "settled" | "lp">("active");
  const [revealedMap, setRevealedMap] = useState<Record<string, boolean>>(() => {
    const map: Record<string, boolean> = {};
    for (const pos of activePositions) {
      map[pos.id] = pos.revealed;
    }
    return map;
  });

  const handleRevealAll = () => {
    const allRevealed: Record<string, boolean> = {};
    for (const pos of activePositions) {
      allRevealed[pos.id] = true;
    }
    setRevealedMap(allRevealed);
  };

  const handleRevealOne = (id: string) => {
    setRevealedMap((prev) => ({ ...prev, [id]: true }));
  };

  const activeCount = activePositions.length;
  const settledCount = settledPositions.length;

  return (
    <div className="container" style={{ paddingTop: 48, paddingBottom: 80 }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          marginBottom: 32,
        }}
      >
        <div>
          <h1 className="display" style={{ fontSize: 36, letterSpacing: "-0.04em" }}>
            Portfolio
          </h1>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              marginTop: 8,
              color: "var(--color-privacy-text)",
              fontSize: 13,
            }}
          >
            <LockIcon size={14} stroke="var(--color-privacy)" />
            Your positions are encrypted. Only you can decrypt them.
          </div>
        </div>
        <button className="btn btn-secondary" onClick={handleRevealAll}>
          <IconEye size={14} />
          Reveal all
        </button>
      </div>

      {/* Stat cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 12,
          marginBottom: 32,
        }}
      >
        <StatCard label="Active positions" value={activeCount} mono={false} />
        <StatCard label="Total at stake" value="****" encrypted />
        <StatCard
          label="Unrealized P&L"
          value="+****"
          valueColor="var(--color-yes-text)"
          encrypted
        />
        <StatCard label="Claimable" value="856 cUSDT" />
      </div>

      {/* Tabs */}
      <div
        style={{
          borderBottom: "1px solid var(--color-border-subtle)",
          display: "flex",
          marginBottom: 0,
        }}
      >
        <button
          className={`tab${activeTab === "active" ? " tab--active" : ""}`}
          onClick={() => setActiveTab("active")}
        >
          Active ({activeCount})
        </button>
        <button
          className={`tab${activeTab === "settled" ? " tab--active" : ""}`}
          onClick={() => setActiveTab("settled")}
        >
          Settled ({settledCount})
        </button>
        <button
          className={`tab${activeTab === "lp" ? " tab--active" : ""}`}
          onClick={() => setActiveTab("lp")}
        >
          LP Positions
        </button>
      </div>

      {/* Tab content */}
      <div className="card" style={{ borderRadius: "0 0 14px 14px", padding: 0 }}>
        {activeTab === "active" && (
          <table className="table">
            <thead>
              <tr>
                <th>Market</th>
                <th>Side</th>
                <th>Position</th>
                <th>Entry</th>
                <th>Current</th>
                <th>P&L</th>
                <th style={{ width: 32 }} />
              </tr>
            </thead>
            <tbody>
              {activePositions.map((pos) => {
                const delta = pos.current - pos.entry;
                const deltaPositive = delta >= 0;
                const isRevealed = revealedMap[pos.id];

                return (
                  <tr key={pos.id} className="interactive">
                    <td>
                      <div style={{ fontWeight: 500 }}>{pos.question}</div>
                      <div
                        style={{
                          fontSize: 11,
                          color: "var(--color-text-tertiary)",
                          marginTop: 2,
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        <IconClock size={11} stroke="var(--color-text-tertiary)" />
                        {pos.expiry}
                      </div>
                    </td>
                    <td>
                      <span className={`pill ${pos.side === "YES" ? "pill-yes" : "pill-no"}`}>
                        {pos.side}
                      </span>
                    </td>
                    <td>
                      <EncryptedValue
                        value={pos.amount}
                        revealed={isRevealed}
                        onReveal={() => handleRevealOne(pos.id)}
                        size="sm"
                      />
                    </td>
                    <td>
                      <span className="mono" style={{ color: "var(--color-text-secondary)" }}>
                        {pos.entry}%
                      </span>
                    </td>
                    <td>
                      <span
                        className="mono"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        {pos.current}%
                        {deltaPositive ? (
                          <IconArrowUp
                            size={12}
                            stroke="var(--color-yes-text)"
                          />
                        ) : (
                          <IconArrowDown
                            size={12}
                            stroke="var(--color-no-text)"
                          />
                        )}
                      </span>
                    </td>
                    <td>
                      {isRevealed ? (
                        <span
                          className="mono"
                          style={{
                            color: deltaPositive
                              ? "var(--color-yes-text)"
                              : "var(--color-no-text)",
                          }}
                        >
                          {deltaPositive ? "+" : ""}
                          {delta}%
                        </span>
                      ) : (
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                            color: "var(--color-privacy-text)",
                          }}
                        >
                          <LockIcon size={12} stroke="var(--color-privacy)" />
                          <span
                            className="mono"
                            style={{
                              letterSpacing: "0.15em",
                              fontSize: 13,
                            }}
                          >
                            ****
                          </span>
                        </span>
                      )}
                    </td>
                    <td>
                      <IconChevronRight
                        size={16}
                        stroke="var(--color-text-tertiary)"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {activeTab === "settled" && (
          <table className="table">
            <thead>
              <tr>
                <th>Market</th>
                <th>Side</th>
                <th>Stake</th>
                <th>Payout</th>
                <th>Result</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {settledPositions.map((pos) => (
                <tr key={pos.id} className="interactive">
                  <td style={{ fontWeight: 500 }}>{pos.question}</td>
                  <td>
                    <span className={`pill ${pos.side === "YES" ? "pill-yes" : "pill-no"}`}>
                      {pos.side}
                    </span>
                  </td>
                  <td>
                    <span className="mono">{pos.stake.toLocaleString()} cUSDT</span>
                  </td>
                  <td>
                    <span className="mono">{pos.payout.toLocaleString()} cUSDT</span>
                  </td>
                  <td>
                    <span
                      className={`pill ${pos.result === "WON" ? "pill-yes" : "pill-no"}`}
                    >
                      {pos.result}
                    </span>
                  </td>
                  <td>
                    <span style={{ color: "var(--color-text-secondary)", fontSize: 13 }}>
                      {pos.date}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {activeTab === "lp" && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "80px 20px",
              gap: 16,
            }}
          >
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 14,
                background: "var(--color-bg-overlay)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <IconChart size={24} stroke="var(--color-text-tertiary)" />
            </div>
            <div
              style={{
                fontSize: 15,
                fontWeight: 500,
                color: "var(--color-text-secondary)",
              }}
            >
              No LP positions yet
            </div>
            <div
              style={{
                fontSize: 13,
                color: "var(--color-text-tertiary)",
                maxWidth: 320,
                textAlign: "center",
                lineHeight: 1.5,
              }}
            >
              Provide liquidity to markets and earn fees from trading activity.
            </div>
            <button className="btn btn-secondary" style={{ marginTop: 8 }}>
              Explore markets
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
