"use client";

import React, { useState } from "react";
import { useAccount } from "wagmi";
import { useFactoryMarkets } from "@/hooks/useFactory";
import { useMarket, useHasPosition } from "@/hooks/useMarket";
import { useClaimWinnings } from "@/hooks/useClaimWinnings";
import { useUserDecrypt as __useUserDecrypt } from "@/hooks/useUserDecrypt";
import { useNullCastStore } from "@/lib/store";
import {
  LockIcon,
  LockOpenIcon,
  CheckIcon,
  ArrowUpIcon,
  ArrowDownIcon,
} from "@/components/shared/Icons";
import { EncryptedValue } from "@/components/shared/EncryptedValue";

/* ── MarketStatus enum matching contract ─────────────────────── */
const MarketStatus: Record<number, string> = {
  0: "OPEN",
  1: "CLOSED",
  2: "RESOLVED",
};

/* ── Stat card ───────────────────────────────────────────────── */
function Stat({
  label,
  children,
  sub,
}: {
  label: string;
  children: React.ReactNode;
  sub?: string;
}) {
  return (
    <div className="card" style={{ padding: 16 }}>
      <span className="eyebrow">{label}</span>
      <div className="mono" style={{ fontSize: 22, fontWeight: 600, marginTop: 8 }}>
        {children}
      </div>
      {sub && (
        <div style={{ fontSize: 12, color: "var(--t-3)", marginTop: 4 }}>{sub}</div>
      )}
    </div>
  );
}

/* ── Single position row (reads market data via hook) ────────── */
function PositionRow({
  marketAddress,
  autoDecrypt,
}: {
  marketAddress: `0x${string}`;
  userAddress: `0x${string}`;
  autoDecrypt?: boolean;
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

  // Decrypt support
  const { decrypt, isDecrypting, yesAmount, noAmount, isDecrypted } =
    __useUserDecrypt(marketAddress);

  const triggered = React.useRef(false);
  React.useEffect(() => {
    if (autoDecrypt && !isDecrypted && !isDecrypting && !triggered.current) {
      triggered.current = true;
      decrypt();
    }
  }, [autoDecrypt, isDecrypted, isDecrypting, decrypt]);

  const decryptState: "hidden" | "decrypting" | "revealed" = isDecrypted
    ? "revealed"
    : isDecrypting
      ? "decrypting"
      : "hidden";

  const yesAmt = yesAmount ? (Number(yesAmount) / 1e6).toFixed(2) : null;
  const noAmt = noAmount ? (Number(noAmount) / 1e6).toFixed(2) : null;
  const hasYes = yesAmount && yesAmount > BigInt(0);
  const hasNo = noAmount && noAmount > BigInt(0);

  const isResolved = status === 2;
  const statusLabel = status !== undefined ? MarketStatus[status] ?? "UNKNOWN" : "...";
  const delta = yesOdds !== undefined ? yesOdds - 50 : 0;

  const marketCell = (rowSpan?: number) => (
    <td rowSpan={rowSpan}>
      <div style={{ fontWeight: 500, color: "var(--t-1)" }}>
        {isMarketLoading ? "Loading..." : question ?? "Unknown market"}
      </div>
      <span className="mono" style={{ fontSize: 11, color: "var(--t-4)" }}>
        {marketAddress.slice(0, 6)}...{marketAddress.slice(-4)}
      </span>
    </td>
  );

  const oddsCell = (rowSpan?: number) => (
    <td rowSpan={rowSpan}>
      <span className="mono" style={{ fontSize: 13, color: "var(--t-2)" }}>
        {isMarketLoading ? "..." : `${yesOdds}%`}
      </span>
    </td>
  );

  const deltaCell = (rowSpan?: number) => (
    <td rowSpan={rowSpan}>
      {!isMarketLoading && (
        <span className="row gap-2 mono" style={{ fontSize: 13, color: delta > 0 ? "var(--yes-hi)" : delta < 0 ? "var(--no-hi)" : "var(--t-3)" }}>
          {delta > 0 ? <ArrowUpIcon size={12} /> : delta < 0 ? <ArrowDownIcon size={12} /> : null}
          {delta > 0 ? "+" : ""}{delta}%
        </span>
      )}
    </td>
  );

  const statusCell = (rowSpan?: number) => (
    <td rowSpan={rowSpan}>
      <span className={`pill ${statusLabel === "OPEN" ? "open" : statusLabel === "RESOLVED" ? "resolved" : ""}`}>
        {statusLabel}
      </span>
    </td>
  );

  const actionCell = (rowSpan?: number) => (
    <td rowSpan={rowSpan}>{isResolved ? <ClaimButton marketAddress={marketAddress} /> : null}</td>
  );

  // If decrypted and has BOTH sides, show 2 rows
  if (isDecrypted && hasYes && hasNo) {
    return (
      <>
        <tr>
          {marketCell(2)}
          <td><span className="pill yes">YES</span></td>
          <td><span className="enc-val"><span className="reveal num">{yesAmt}</span> <span style={{color:"var(--t-3)",fontFamily:"var(--f-mono)",fontSize:12}}>cUSDT</span></span></td>
          {oddsCell(2)}
          {deltaCell(2)}
          {statusCell(2)}
          {actionCell(2)}
        </tr>
        <tr>
          <td><span className="pill no">NO</span></td>
          <td><span className="enc-val"><span className="reveal num">{noAmt}</span> <span style={{color:"var(--t-3)",fontFamily:"var(--f-mono)",fontSize:12}}>cUSDT</span></span></td>
        </tr>
      </>
    );
  }

  // Single row — either not decrypted or only one side
  const sideLabel = isDecrypted
    ? (hasYes ? "YES" : hasNo ? "NO" : storePosition?.side ?? "--")
    : (storePosition?.side ?? "--");
  const sideClass = sideLabel === "YES" ? "yes" : sideLabel === "NO" ? "no" : "";
  const displayAmount = isDecrypted ? (hasYes ? yesAmt : noAmt) ?? "0.00" : "0.00";

  return (
    <tr>
      {marketCell()}
      <td>
        {sideLabel !== "--" ? (
          <span className={`pill ${sideClass}`}>{sideLabel}</span>
        ) : (
          <span style={{ color: "var(--t-4)" }}>--</span>
        )}
      </td>
      <td>
        <EncryptedValue state={decryptState} value={displayAmount} onDecrypt={decrypt} unit="cUSDT" compact />
      </td>
      {oddsCell()}
      {deltaCell()}
      {statusCell()}
      {actionCell()}
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
      <span className="row gap-2" style={{ color: "var(--yes-hi)", fontSize: 12, fontWeight: 500 }}>
        <CheckIcon size={12} />
        Claimed
      </span>
    );
  }

  return (
    <button
      className="btn primary sm"
      onClick={claimWinnings}
      disabled={isWriting || isConfirming}
    >
      {isWriting ? "Confirm..." : isConfirming ? "Claiming..." : "Claim"}
    </button>
  );
}

/* ── Wrapper that checks hasPosition for a single market ─────── */
function MarketPositionCheck({
  marketAddress,
  userAddress,
  autoDecrypt,
}: {
  marketAddress: `0x${string}`;
  userAddress: `0x${string}`;
  autoDecrypt?: boolean;
}) {
  const hasPos = useHasPosition(marketAddress, userAddress);

  if (hasPos === true) {
    return <PositionRow marketAddress={marketAddress} userAddress={userAddress} autoDecrypt={autoDecrypt} />;
  }

  return null;
}

/* ── Portfolio page ──────────────────────────────────────────── */
export default function PortfolioPage() {
  const { address, isConnected } = useAccount();
  const { allMarkets, isLoading: isMarketsLoading } = useFactoryMarkets();
  const storePositions = useNullCastStore((s) => s.positions);

  const [activeTab, setActiveTab] = useState<"active" | "settled" | "lp">("active");
  const [decryptAll, setDecryptAll] = useState(false);

  // Not connected
  if (!isConnected || !address) {
    return (
      <div className="page">
        <div className="container">
          <div className="page-head" style={{ padding: 0, marginBottom: 32 }}>
            <h1 style={{ fontSize: 36 }}>Portfolio</h1>
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
            <p style={{ fontSize: 15, fontWeight: 500, color: "var(--t-2)" }}>
              Connect your wallet to view your portfolio
            </p>
            <p style={{ fontSize: 13, color: "var(--t-3)", maxWidth: 360 }}>
              Your positions are encrypted on-chain. Only your wallet can decrypt them.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const tabs = [
    { key: "active" as const, label: "Active" },
    { key: "settled" as const, label: "Settled" },
    { key: "lp" as const, label: "LP" },
  ];

  return (
    <div className="page">
      <div className="container">
        {/* Header */}
        <div className="row between" style={{ marginBottom: 32 }}>
          <div className="page-head" style={{ padding: 0 }}>
            <h1 style={{ fontSize: 36 }}>Portfolio</h1>
            <p className="sub">
              Your positions are encrypted. Only you can decrypt them.
            </p>
          </div>
          <button className="btn secondary" onClick={() => setDecryptAll(true)} disabled={decryptAll}>
            <LockOpenIcon size={14} />
            {decryptAll ? "Decrypting…" : "Decrypt all"}
          </button>
        </div>

        {/* Stats */}
        <div className="grid-4" style={{ marginBottom: 32 }}>
          <Stat label="Active positions" sub="On-chain">
            {isMarketsLoading ? "..." : storePositions.length}
          </Stat>
          <Stat label="Total at stake" sub="Encrypted">
            <EncryptedValue state="hidden" unit="cUSDT" compact />
          </Stat>
          <Stat label="Unrealized P&L" sub="Encrypted">
            <EncryptedValue state="hidden" unit="cUSDT" compact />
          </Stat>
          <Stat label="Claimable" sub="Resolved markets">
            <span className="mono">0</span>
          </Stat>
        </div>

        {/* Tabs card */}
        <div className="card" style={{ padding: 0 }}>
          {/* Tab header */}
          <div
            style={{
              display: "flex",
              gap: 6,
              padding: "12px 16px",
              borderBottom: "1px solid var(--border-1)",
            }}
          >
            {tabs.map((t) => (
              <button
                key={t.key}
                className={`btn sm ${activeTab === t.key ? "secondary" : "ghost"}`}
                onClick={() => setActiveTab(t.key)}
                style={{
                  borderColor: activeTab === t.key ? "var(--border-3)" : undefined,
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Active tab */}
          {activeTab === "active" && (
            <>
              {isMarketsLoading ? (
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
              ) : allMarkets.length === 0 ? (
                <div
                  style={{
                    padding: "80px 20px",
                    textAlign: "center",
                    color: "var(--t-3)",
                    fontSize: 13,
                  }}
                >
                  No markets found. Place a bet to see your positions here.
                </div>
              ) : (
                <table className="table">
                  <thead>
                    <tr>
                      <th>Market</th>
                      <th>Side</th>
                      <th>Position</th>
                      <th>Entry</th>
                      <th>Current</th>
                      <th>Status</th>
                      <th style={{ width: 80 }} />
                    </tr>
                  </thead>
                  <tbody>
                    {allMarkets.map((addr) => (
                      <MarketPositionCheck
                        key={addr}
                        marketAddress={addr}
                        userAddress={address}
                        autoDecrypt={decryptAll}
                      />
                    ))}
                  </tbody>
                </table>
              )}

              {!isMarketsLoading && allMarkets.length > 0 && (
                <div
                  className="row gap-2"
                  style={{
                    padding: "10px 16px",
                    borderTop: "1px solid var(--border-1)",
                    fontSize: 11,
                    color: "var(--t-4)",
                  }}
                >
                  <LockIcon size={10} />
                  Checking {allMarkets.length} market(s) for positions. Markets with no position are hidden.
                </div>
              )}
            </>
          )}

          {/* Settled tab */}
          {activeTab === "settled" && (
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
              <span style={{ fontSize: 14, fontWeight: 500, color: "var(--t-2)" }}>
                No settled positions yet
              </span>
              <span style={{ fontSize: 12, color: "var(--t-3)", maxWidth: 320 }}>
                Resolved markets where you claimed winnings will appear here.
              </span>
            </div>
          )}

          {/* LP tab */}
          {activeTab === "lp" && (
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
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: "50%",
                  border: "2px dashed var(--border-2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <LockIcon size={22} />
              </div>
              <span style={{ fontSize: 14, fontWeight: 500, color: "var(--t-2)" }}>
                No liquidity positions yet
              </span>
              <span style={{ fontSize: 12, color: "var(--t-3)", maxWidth: 320 }}>
                Provide liquidity to markets and earn fees from trading activity.
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
