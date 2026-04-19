"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { useFactoryMarkets } from "@/hooks/useFactory";
import { useMarket, useHasPosition } from "@/hooks/useMarket";
import { useClaimWinnings } from "@/hooks/useClaimWinnings";
import { useNullCastStore } from "@/lib/store";
import {
  LockIcon,
  IconChevronRight,
  IconChart,
  IconCheck,
  IconWallet,
} from "@/components/shared/Icons";

/* ── MarketStatus enum matching contract ─────────────────────── */
const MarketStatus: Record<number, string> = {
  0: "OPEN",
  1: "CLOSED",
  2: "RESOLVED",
};

/* ── Stat card ───────────────────────────────────────────────── */
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
    <div className="card" style={{ padding: 20 }}>
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
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
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
        {encrypted && <LockIcon size={14} stroke="var(--color-privacy)" />}
      </div>
    </div>
  );
}

/* ── Single position row (reads market data via hook) ────────── */
function PositionRow({
  marketAddress,
}: {
  marketAddress: `0x${string}`;
  userAddress: `0x${string}`;
}) {
  const {
    question,
    status,
    yesOdds,
    isLoading: isMarketLoading,
  } = useMarket(marketAddress);

  const storePosition = useNullCastStore((s) =>
    s.positions.find((p) => p.marketAddress === marketAddress)
  );

  const isResolved = status === 2;
  const statusLabel = status !== undefined ? MarketStatus[status] ?? "UNKNOWN" : "...";

  return (
    <tr className="interactive">
      <td>
        <div style={{ fontWeight: 500 }}>
          {isMarketLoading ? "Loading..." : question ?? "Unknown market"}
        </div>
        <div
          style={{
            fontSize: 11,
            color: "var(--color-text-tertiary)",
            marginTop: 2,
            fontFamily: "var(--font-mono)",
          }}
        >
          {marketAddress.slice(0, 6)}...{marketAddress.slice(-4)}
        </div>
      </td>
      <td>
        <span
          className={`pill ${statusLabel === "OPEN" ? "pill-yes" : statusLabel === "RESOLVED" ? "pill-no" : ""}`}
        >
          {statusLabel}
        </span>
      </td>
      <td>
        {storePosition ? (
          <span className={`pill ${storePosition.side === "YES" ? "pill-yes" : "pill-no"}`}>
            {storePosition.side}
          </span>
        ) : (
          <span style={{ color: "var(--color-text-tertiary)", fontSize: 13 }}>--</span>
        )}
      </td>
      <td>
        {/* Position amounts are encrypted (euint64) — show encrypted UX */}
        <span
          className="mono"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            color: "var(--color-privacy-text)",
          }}
        >
          <LockIcon size={12} stroke="var(--color-privacy)" />
          <span style={{ letterSpacing: "0.15em", fontSize: 13 }}>
            encrypted
          </span>
        </span>
      </td>
      <td>
        <span className="mono" style={{ color: "var(--color-text-secondary)" }}>
          {isMarketLoading ? "..." : `${yesOdds}%`}
        </span>
      </td>
      <td>
        {isResolved ? (
          <ClaimButton marketAddress={marketAddress} />
        ) : (
          <IconChevronRight size={16} stroke="var(--color-text-tertiary)" />
        )}
      </td>
    </tr>
  );
}

/* ── Claim button for resolved markets ───────────────────────── */
function ClaimButton({ marketAddress }: { marketAddress: `0x${string}` }) {
  const {
    claimWinnings,
    isWriting,
    isConfirming,
    isConfirmed,
  } = useClaimWinnings(marketAddress);

  if (isConfirmed) {
    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          color: "var(--color-yes-text)",
          fontSize: 13,
          fontWeight: 500,
        }}
      >
        <IconCheck size={12} stroke="var(--color-yes-text)" />
        Claimed
      </span>
    );
  }

  return (
    <button
      className="btn btn-sm btn-primary"
      onClick={claimWinnings}
      disabled={isWriting || isConfirming}
      style={{
        opacity: isWriting || isConfirming ? 0.6 : 1,
        fontSize: 12,
      }}
    >
      {isWriting
        ? "Confirm..."
        : isConfirming
          ? "Claiming..."
          : "Claim"}
    </button>
  );
}

/* ── Wrapper that checks hasPosition for a single market ─────── */
function MarketPositionCheck({
  marketAddress,
  userAddress,
}: {
  marketAddress: `0x${string}`;
  userAddress: `0x${string}`;
}) {
  const hasPos = useHasPosition(marketAddress, userAddress);

  // Report back that we have a position (for counting)
  if (hasPos === true) {
    // Use a ref-safe way to report — check in the parent via state
    return <PositionRow marketAddress={marketAddress} userAddress={userAddress} />;
  }

  return null;
}

/* ── Portfolio page ──────────────────────────────────────────── */
export default function PortfolioPage() {
  const { address, isConnected } = useAccount();
  const { allMarkets, isLoading: isMarketsLoading } = useFactoryMarkets();
  const storePositions = useNullCastStore((s) => s.positions);

  const [activeTab, setActiveTab] = useState<"active" | "settled" | "lp">("active");

  // Not connected state
  if (!isConnected || !address) {
    return (
      <div className="container" style={{ paddingTop: 48, paddingBottom: 80 }}>
        <div style={{ marginBottom: 32 }}>
          <h1 className="display" style={{ fontSize: 36, letterSpacing: "-0.04em" }}>
            Portfolio
          </h1>
        </div>
        <div
          className="card"
          style={{
            padding: "64px 32px",
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 16,
          }}
        >
          <IconWallet size={32} stroke="var(--color-text-tertiary)" />
          <p
            style={{
              fontSize: 15,
              fontWeight: 500,
              color: "var(--color-text-secondary)",
            }}
          >
            Connect your wallet to view your portfolio
          </p>
          <p
            style={{
              fontSize: 13,
              color: "var(--color-text-tertiary)",
              maxWidth: 360,
              lineHeight: 1.5,
            }}
          >
            Your positions are encrypted on-chain. Only your wallet can decrypt them.
          </p>
        </div>
      </div>
    );
  }

  // Collect market addresses where user has a cached position in the store
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
            Your positions are encrypted. Only you can decrypt them via FHEVM SDK.
          </div>
        </div>
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
        <StatCard
          label="Markets checked"
          value={isMarketsLoading ? "..." : allMarkets.length}
          mono={false}
        />
        <StatCard
          label="Cached positions"
          value={storePositions.length}
          mono={false}
        />
        <StatCard label="Total at stake" value="****" encrypted />
        <StatCard label="Unrealized P&L" value="****" encrypted />
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
          Active
        </button>
        <button
          className={`tab${activeTab === "settled" ? " tab--active" : ""}`}
          onClick={() => setActiveTab("settled")}
        >
          Settled
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
          <>
            {isMarketsLoading ? (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "60px 20px",
                  gap: 12,
                }}
              >
                <div
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: "50%",
                    border: "2px solid var(--color-accent)",
                    borderTopColor: "transparent",
                    animation: "spin 1s linear infinite",
                  }}
                />
                <span style={{ fontSize: 14, color: "var(--color-text-secondary)" }}>
                  Loading markets...
                </span>
              </div>
            ) : allMarkets.length === 0 ? (
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
                <div style={{ fontSize: 15, fontWeight: 500, color: "var(--color-text-secondary)" }}>
                  No markets found
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
                  No markets have been created yet. Create a market or place a bet to see your positions here.
                </div>
              </div>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Market</th>
                    <th>Status</th>
                    <th>Side</th>
                    <th>Position</th>
                    <th>Odds</th>
                    <th style={{ width: 80 }} />
                  </tr>
                </thead>
                <tbody>
                  {allMarkets.map((addr) => (
                    <MarketPositionCheck
                      key={addr}
                      marketAddress={addr}
                      userAddress={address}
                    />
                  ))}
                </tbody>
              </table>
            )}

            {/* Note about empty results */}
            {!isMarketsLoading && allMarkets.length > 0 && (
              <div
                style={{
                  padding: "12px 20px",
                  borderTop: "1px solid var(--color-border-subtle)",
                  fontSize: 12,
                  color: "var(--color-text-tertiary)",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <LockIcon size={11} stroke="var(--color-text-tertiary)" />
                Checking {allMarkets.length} market(s) for your positions via hasPosition(). Markets with no position are hidden.
              </div>
            )}
          </>
        )}

        {activeTab === "settled" && (
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
              <IconCheck size={24} stroke="var(--color-text-tertiary)" />
            </div>
            <div style={{ fontSize: 15, fontWeight: 500, color: "var(--color-text-secondary)" }}>
              No settled positions yet
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
              Once markets you participated in are resolved and you claim your winnings, they will appear here.
            </div>
          </div>
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
            <div style={{ fontSize: 15, fontWeight: 500, color: "var(--color-text-secondary)" }}>
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
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
