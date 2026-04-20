"use client";

import React, { useState } from "react";
import { useAccount } from "wagmi";
import { useFactoryMarkets } from "@/hooks/useFactory";
import { useMarket, useHasPosition } from "@/hooks/useMarket";
import { useClaimWinnings } from "@/hooks/useClaimWinnings";
import { useUserDecrypt as __useUserDecrypt } from "@/hooks/useUserDecrypt";
import { useNullCastStore } from "@/lib/store";
import { Icon } from "@/components/shared/Icons";
import { CipherReveal } from "@/components/shared/CipherReveal";


/* ── Stat (inline) ───────────────────────────────────────────── */
function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mono" style={{ fontSize: 34, fontWeight: 500, letterSpacing: "-0.02em", lineHeight: 1.1 }}>
        {children}
      </div>
      <div style={{ marginTop: 6, fontSize: 10, color: "var(--ink-3)", letterSpacing: "0.12em", textTransform: "uppercase" }}>
        {label}
      </div>
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

  const { decrypt, isDecrypting, yesAmount, noAmount, isDecrypted } =
    __useUserDecrypt(marketAddress);

  const triggered = React.useRef(false);
  React.useEffect(() => {
    if (autoDecrypt && !isDecrypted && !isDecrypting && !triggered.current) {
      triggered.current = true;
      decrypt();
    }
  }, [autoDecrypt, isDecrypted, isDecrypting, decrypt]);

  const yesAmt = yesAmount ? (Number(yesAmount) / 1e6).toFixed(2) : null;
  const noAmt = noAmount ? (Number(noAmount) / 1e6).toFixed(2) : null;
  const hasYes = yesAmount && yesAmount > BigInt(0);
  const hasNo = noAmount && noAmount > BigInt(0);

  const sideLabel = isDecrypted
    ? hasYes ? "YES" : hasNo ? "NO" : storePosition?.side ?? "--"
    : storePosition?.side ?? "--";

  const displayAmount = isDecrypted ? (hasYes ? yesAmt : noAmt) ?? "0.00" : "0.00";
  const entryOdds = 50;
  const currentOdds = yesOdds ?? 50;
  const delta = currentOdds - entryOdds;

  const pnl = isDecrypted ? (delta * parseFloat(displayAmount) / 100) : 0;
  const isResolved = status === 2;

  const gridStyle: React.CSSProperties = {
    width: "100%",
    display: "grid",
    gridTemplateColumns: "2fr 60px 120px 140px 120px",
    alignItems: "center",
    padding: "16px 18px",
    borderBottom: "1px solid var(--line)",
    textAlign: "left",
    background: "transparent",
    transition: "background 160ms",
    cursor: "pointer",
    border: "none",
  };

  return (
    <>
    <div
      style={gridStyle}
      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-1)")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      <span
        className="serif"
        style={{
          fontSize: 15,
          color: "var(--ink-1)",
          letterSpacing: "-0.005em",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          paddingRight: 16,
        }}
      >
        {isMarketLoading ? "Loading..." : question ?? "Unknown market"}
      </span>

      <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: sideLabel === "YES" ? "var(--yes)" : sideLabel === "NO" ? "var(--no)" : "var(--ink-4)",
          }}
        />
        <span
          className="mono"
          style={{
            fontSize: 11,
            color: sideLabel === "YES" ? "var(--yes)" : sideLabel === "NO" ? "var(--no)" : "var(--ink-4)",
          }}
        >
          {sideLabel}
        </span>
      </span>

      <span className="mono" style={{ fontSize: 13, color: "var(--ink-1)" }}>
        <CipherReveal value={displayAmount} reveal={isDecrypted || !!autoDecrypt} width={7} />
      </span>

      <span
        className="mono"
        style={{ fontSize: 12, color: "var(--ink-2)", display: "flex", alignItems: "center", gap: 6 }}
      >
        <span style={{ color: "var(--ink-3)" }}>{entryOdds}%</span>
        <Icon name="arrow-right" size={10} color="var(--ink-4)" />
        <span style={{ color: "var(--ink-1)" }}>{currentOdds}%</span>
        {delta !== 0 && (
          <span
            style={{
              color: delta > 0 ? "var(--yes)" : "var(--no)",
              fontSize: 10,
            }}
          >
            {delta > 0 ? "\u25B2" : "\u25BC"}{Math.abs(delta)}
          </span>
        )}
      </span>

      <span
        className="mono"
        style={{
          fontSize: 13,
          textAlign: "right",
          color: isDecrypted
            ? pnl >= 0 ? "var(--yes)" : "var(--no)"
            : "var(--ink-1)",
        }}
      >
        {isDecrypted && pnl >= 0 ? "+" : ""}
        <CipherReveal value={Math.abs(pnl).toFixed(2)} reveal={isDecrypted || !!autoDecrypt} width={6} />
      </span>
    </div>
    {isResolved && (
      <div style={{ padding: "0 18px 12px", borderBottom: "1px solid var(--line)" }}>
        <ClaimButton marketAddress={marketAddress} />
      </div>
    )}
    </>
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
      <span style={{ color: "var(--yes)", fontSize: 12, fontWeight: 500, display: "flex", alignItems: "center", gap: 4 }}>
        <Icon name="check" size={12} />
        Claimed
      </span>
    );
  }

  return (
    <button
      onClick={claimWinnings}
      disabled={isWriting || isConfirming}
      style={{
        padding: "6px 14px",
        fontSize: 12,
        background: "var(--gold)",
        color: "#1A1511",
        borderRadius: 3,
        fontWeight: 500,
        border: "none",
        cursor: "pointer",
      }}
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
  useNullCastStore((s) => s.positions);

  const [revealAll, setRevealAll] = useState(false);

  const positionCount = allMarkets.length;

  return (
    <div className="page-in" style={{ maxWidth: 1280, margin: "0 auto", padding: "44px 48px 80px" }}>
      {/* Header row */}
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 36 }}>
        <h1 className="serif" style={{ fontSize: 38, fontWeight: 500, letterSpacing: "-0.02em" }}>
          Portfolio
        </h1>
        <button
          onClick={() => setRevealAll(true)}
          disabled={revealAll || !isConnected || !address}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: 12,
            padding: "8px 14px",
            border: `1px solid ${revealAll ? "var(--line)" : "var(--gold-dim)"}`,
            borderRadius: 3,
            color: revealAll ? "var(--ink-3)" : "var(--gold)",
            background: "transparent",
            cursor: revealAll ? "default" : "pointer",
          }}
        >
          <Icon name="eye" size={12} />
          {revealAll ? "All revealed" : "Reveal all"}
        </button>
      </div>

      {/* Stats row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 48,
          paddingBottom: 32,
          borderBottom: "1px solid var(--line)",
        }}
      >
        <Stat label="Positions">
          {isMarketsLoading ? "..." : positionCount}
        </Stat>
        <div>
          <div className="mono" style={{ fontSize: 34, fontWeight: 500, letterSpacing: "-0.02em", lineHeight: 1.1 }}>
            <CipherReveal value="0.00" reveal={revealAll} width={8} />
          </div>
          <div style={{ marginTop: 6, fontSize: 10, color: "var(--ink-3)", letterSpacing: "0.12em", textTransform: "uppercase" }}>
            At stake
          </div>
        </div>
        <div>
          <div
            className="mono"
            style={{
              fontSize: 34,
              fontWeight: 500,
              letterSpacing: "-0.02em",
              lineHeight: 1.1,
              color: "var(--ink-1)",
            }}
          >
            <CipherReveal value="0.00" reveal={revealAll} width={8} />
          </div>
          <div style={{ marginTop: 6, fontSize: 10, color: "var(--ink-3)", letterSpacing: "0.12em", textTransform: "uppercase" }}>
            P&amp;L
          </div>
        </div>
        <div>
          <div className="mono" style={{ fontSize: 34, fontWeight: 500, letterSpacing: "-0.02em", lineHeight: 1.1, color: "var(--gold)" }}>
            0.00
          </div>
          <div style={{ marginTop: 6, fontSize: 10, color: "var(--ink-3)", letterSpacing: "0.12em", textTransform: "uppercase" }}>
            Claimable
          </div>
        </div>
      </div>

      {/* Table */}
      <div style={{ marginTop: 36 }}>
        {/* Header row */}
        <div
          className="mono"
          style={{
            display: "grid",
            gridTemplateColumns: "2fr 60px 120px 140px 120px",
            padding: "10px 18px",
            fontSize: 9,
            color: "var(--ink-4)",
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            borderBottom: "1px solid var(--line)",
          }}
        >
          <span>Market</span>
          <span>Side</span>
          <span>Amount</span>
          <span>Odds</span>
          <span style={{ textAlign: "right" }}>P&amp;L</span>
        </div>

        {/* Content */}
        {!isConnected || !address ? (
          <div style={{ padding: "60px 20px", textAlign: "center", color: "var(--ink-3)", fontSize: 13 }}>
            Connect wallet to view positions
          </div>
        ) : isMarketsLoading ? (
          <div style={{ padding: "60px 20px", textAlign: "center", color: "var(--ink-3)", fontSize: 13 }}>
            Loading markets...
          </div>
        ) : allMarkets.length === 0 ? (
          <div style={{ padding: "60px 20px", textAlign: "center", color: "var(--ink-3)", fontSize: 13 }}>
            No positions found. Place a bet to see your positions here.
          </div>
        ) : (
          allMarkets.map((addr) => (
            <MarketPositionCheck
              key={addr}
              marketAddress={addr}
              userAddress={address}
              autoDecrypt={revealAll}
            />
          ))
        )}
      </div>
    </div>
  );
}
