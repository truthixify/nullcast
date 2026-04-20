"use client";

import Link from "next/link";
import { useAccount } from "wagmi";
import { useFactoryMarkets } from "@/hooks/useFactory";
import { useMarket } from "@/hooks/useMarket";
import { LockIcon, PlusIcon, CheckIcon } from "@/components/shared/Icons";

/* ── Status label map ────────────────────────────────────────── */

const STATUS_LABELS: Record<number, string> = {
  0: "Open",
  1: "Expired",
  2: "Resolving",
  3: "Resolved",
  4: "Cancelled",
};

const STATUS_PILL_CLASS: Record<number, string> = {
  0: "pill open",
  1: "pill expired",
  2: "pill expired",
  3: "pill resolved",
  4: "pill cancelled",
};

/* ── Format pool amount ──────────────────────────────────────── */

function formatPool(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/* ── MarketRow — single table row reading from contract ─────── */

function MarketRow({
  address,
  index,
}: {
  address: `0x${string}`;
  index: number;
}) {
  const { question, status, totalPool, isLoading } = useMarket(address);

  if (isLoading) {
    return (
      <tr>
        <td><div className="skel" style={{ width: "80%", height: 14 }} /></td>
        <td><div className="skel" style={{ width: 60, height: 14 }} /></td>
        <td><div className="skel" style={{ width: 50, height: 20 }} /></td>
        <td><div className="skel" style={{ width: 60, height: 28 }} /></td>
      </tr>
    );
  }

  const statusNum = typeof status === "number" ? status : 0;
  const isOpen = statusNum === 0;

  return (
    <tr>
      <td>
        <div style={{ fontWeight: 500, color: "var(--t-1)" }}>
          {question ?? "Unknown market"}
        </div>
        <span
          className="mono"
          style={{ fontSize: 11, color: "var(--t-4)" }}
        >
          {address.slice(0, 6)}...{address.slice(-4)}
        </span>
      </td>
      <td>
        <span className="mono" style={{ fontSize: 13, color: "var(--t-2)" }}>
          {formatPool(totalPool)} cUSDT
        </span>
      </td>
      <td>
        <span className={STATUS_PILL_CLASS[statusNum] ?? "pill"}>
          {STATUS_LABELS[statusNum] ?? "Unknown"}
        </span>
      </td>
      <td>
        {isOpen ? (
          <Link
            href={`/markets/${index}`}
            className="btn primary sm"
          >
            <PlusIcon size={12} />
            Deposit
          </Link>
        ) : (
          <span
            style={{ fontSize: 12, color: "var(--t-4)", fontStyle: "italic" }}
          >
            Closed
          </span>
        )}
      </td>
    </tr>
  );
}

/* ── Liquidity page ──────────────────────────────────────────── */

export default function LiquidityPage() {
  const { isConnected } = useAccount();
  const { allMarkets, isLoading } = useFactoryMarkets();

  /* Not connected */
  if (!isConnected) {
    return (
      <div className="page">
        <div className="container">
          <div className="page-head" style={{ padding: 0, marginBottom: 32 }}>
            <h1 style={{ fontSize: 36 }}>Liquidity</h1>
          </div>
          <div
            className="card elevated"
            style={{
              padding: "64px 32px",
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 16,
            }}
          >
            <LockIcon size={32} />
            <p
              style={{
                fontSize: 15,
                fontWeight: 500,
                color: "var(--t-2)",
              }}
            >
              Connect your wallet to provide liquidity
            </p>
            <p
              style={{
                fontSize: 13,
                color: "var(--t-3)",
                maxWidth: 360,
              }}
            >
              LP positions are encrypted on-chain. Only your wallet can view
              your share.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="container">
        {/* Page head */}
        <div className="page-head" style={{ padding: 0, marginBottom: 24 }}>
          <h1 style={{ fontSize: 36 }}>Liquidity</h1>
          <p className="sub">
            Provide liquidity to prediction markets and earn fees from trading
            activity.
          </p>
        </div>

        {/* How it works */}
        <div className="card elevated" style={{ marginBottom: 24 }}>
          <div className="card-head">
            <h3>How it works</h3>
            <span className="pill enc">
              <LockIcon size={10} /> euint64
            </span>
          </div>
          <div className="card-body" style={{ padding: 20 }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: 24,
              }}
            >
              {/* Step 1 */}
              <div style={{ display: "flex", gap: 12 }}>
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    background: "var(--bg-3)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <span
                    className="mono"
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: "var(--acc)",
                    }}
                  >
                    1
                  </span>
                </div>
                <div>
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: "var(--t-1)",
                      marginBottom: 4,
                    }}
                  >
                    Deposit
                  </div>
                  <p
                    style={{
                      fontSize: 12,
                      color: "var(--t-3)",
                      lineHeight: 1.5,
                      margin: 0,
                    }}
                  >
                    Deposit cUSDT to a market liquidity pool. Your share is
                    tracked as an encrypted euint64.
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div style={{ display: "flex", gap: 12 }}>
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    background: "var(--bg-3)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <span
                    className="mono"
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: "var(--acc)",
                    }}
                  >
                    2
                  </span>
                </div>
                <div>
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: "var(--t-1)",
                      marginBottom: 4,
                    }}
                  >
                    Earn
                  </div>
                  <p
                    style={{
                      fontSize: 12,
                      color: "var(--t-3)",
                      lineHeight: 1.5,
                      margin: 0,
                    }}
                  >
                    Earn 2% of the losing pool, distributed pro-rata to LPs
                    after market resolution.
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div style={{ display: "flex", gap: 12 }}>
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    background: "var(--bg-3)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <span
                    className="mono"
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: "var(--acc)",
                    }}
                  >
                    3
                  </span>
                </div>
                <div>
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: "var(--t-1)",
                      marginBottom: 4,
                    }}
                  >
                    Withdraw
                  </div>
                  <p
                    style={{
                      fontSize: 12,
                      color: "var(--t-3)",
                      lineHeight: 1.5,
                      margin: 0,
                    }}
                  >
                    Withdraw your deposit plus earned fees after the market
                    resolves. All amounts stay encrypted until you decrypt.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Markets table */}
        <div className="card" style={{ padding: 0 }}>
          <div className="card-head" style={{ padding: "12px 16px" }}>
            <h3>Markets</h3>
            <span className="eyebrow">
              {isLoading ? "..." : `${allMarkets.length} available`}
            </span>
          </div>

          {/* Loading */}
          {isLoading && (
            <div
              className="row"
              style={{
                justifyContent: "center",
                padding: "60px 20px",
                gap: 12,
              }}
            >
              <span
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: "50%",
                  border: "2px solid var(--acc)",
                  borderTopColor: "transparent",
                  animation: "spin 1s linear infinite",
                }}
              />
              <span style={{ fontSize: 13, color: "var(--t-2)" }}>
                Loading markets...
              </span>
            </div>
          )}

          {/* Table */}
          {!isLoading && allMarkets.length > 0 && (
            <table className="table">
              <thead>
                <tr>
                  <th>Market</th>
                  <th>Pool</th>
                  <th>Status</th>
                  <th style={{ width: 100 }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {allMarkets.map((addr, i) => (
                  <MarketRow key={addr} address={addr} index={i} />
                ))}
              </tbody>
            </table>
          )}

          {/* Empty state */}
          {!isLoading && allMarkets.length === 0 && (
            <div
              style={{
                padding: "80px 20px",
                textAlign: "center",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 12,
              }}
            >
              <CheckIcon size={24} />
              <span
                style={{
                  fontSize: 14,
                  fontWeight: 500,
                  color: "var(--t-2)",
                }}
              >
                No markets available
              </span>
              <span
                style={{
                  fontSize: 12,
                  color: "var(--t-3)",
                  maxWidth: 320,
                }}
              >
                Markets will appear here once they are created.
              </span>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
