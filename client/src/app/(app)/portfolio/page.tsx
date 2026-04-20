"use client";

import React, { useState, useMemo } from "react";
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

/* ── Position rows for a single market ─────────────────────────── */
function PositionRow({
  marketAddress,
  autoDecrypt,
  onAmountsReady,
}: {
  marketAddress: `0x${string}`;
  userAddress: `0x${string}`;
  autoDecrypt?: boolean;
  onAmountsReady?: (staked: number, potentialWin: number) => void;
}) {
  const {
    question,
    status,
    yesOdds,
    noOdds,
    isLoading: isMarketLoading,
  } = useMarket(marketAddress);

  const { decrypt, isDecrypting, yesAmount, noAmount, isDecrypted, hasYesPosition, hasNoPosition } =
    __useUserDecrypt(marketAddress);

  const triggered = React.useRef(false);
  React.useEffect(() => {
    if (autoDecrypt && !isDecrypted && !isDecrypting && !triggered.current) {
      triggered.current = true;
      decrypt();
    }
  }, [autoDecrypt, isDecrypted, isDecrypting, decrypt]);

  const yesNum = yesAmount ? Number(yesAmount) / 1e6 : 0;
  const noNum = noAmount ? Number(noAmount) / 1e6 : 0;

  // Report aggregate stats to parent
  const reportedRef = React.useRef(false);
  React.useEffect(() => {
    if (isDecrypted && onAmountsReady && !reportedRef.current) {
      reportedRef.current = true;
      const staked = yesNum + noNum;
      // Potential payout if each side wins
      const yesOddsVal = yesOdds ?? 50;
      const noOddsVal = noOdds ?? 50;
      const yesPayout = yesOddsVal > 0 ? yesNum * (100 / yesOddsVal) : 0;
      const noPayout = noOddsVal > 0 ? noNum * (100 / noOddsVal) : 0;
      const potentialWin = (yesPayout - yesNum) + (noPayout - noNum);
      onAmountsReady(staked, potentialWin);
    }
  }, [isDecrypted, yesNum, noNum, yesOdds, noOdds, onAmountsReady]);

  const currentYesOdds = yesOdds ?? 50;
  const currentNoOdds = noOdds ?? 50;
  const isResolved = status === 2;

  // Build rows: one per side the user holds
  const rows: Array<{ side: "YES" | "NO"; amount: number; encrypted: boolean }> = [];

  if (isDecrypted) {
    if (yesNum > 0) rows.push({ side: "YES", amount: yesNum, encrypted: false });
    if (noNum > 0) rows.push({ side: "NO", amount: noNum, encrypted: false });
    if (rows.length === 0) rows.push({ side: "YES", amount: 0, encrypted: false });
  } else {
    if (hasYesPosition) rows.push({ side: "YES", amount: 0, encrypted: true });
    if (hasNoPosition) rows.push({ side: "NO", amount: 0, encrypted: true });
    if (rows.length === 0) rows.push({ side: "YES", amount: 0, encrypted: true });
  }

  const gridStyle: React.CSSProperties = {
    width: "100%",
    display: "grid",
    gridTemplateColumns: "2fr 60px 100px 80px 120px",
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
      {rows.map((row, i) => {
        // Potential payout if this side wins
        const sideOdds = row.side === "YES" ? currentYesOdds : currentNoOdds;
        const payout = !row.encrypted && sideOdds > 0
          ? row.amount * (100 / sideOdds)
          : 0;
        const profit = payout - row.amount;

        return (
          <React.Fragment key={`${marketAddress}-${row.side}-${i}`}>
            <div
              style={gridStyle}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-1)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              {/* Market name */}
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

              {/* Side indicator */}
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: row.side === "YES" ? "var(--yes)" : row.side === "NO" ? "var(--no)" : "var(--ink-4)",
                  }}
                />
                <span
                  className="mono"
                  style={{
                    fontSize: 11,
                    color: row.side === "YES" ? "var(--yes)" : row.side === "NO" ? "var(--no)" : "var(--ink-4)",
                  }}
                >
                  {row.side}
                </span>
              </span>

              {/* Staked amount */}
              <span className="mono" style={{ fontSize: 13, color: "var(--ink-1)" }}>
                {row.encrypted ? (
                  <span style={{ color: "var(--ink-4)", letterSpacing: "0.05em", fontSize: 11 }}>
                    {isDecrypting ? (
                      <span className="pulse-text">decrypting</span>
                    ) : (
                      "encrypted"
                    )}
                  </span>
                ) : (
                  <CipherReveal value={row.amount.toFixed(2)} reveal={true} width={7} />
                )}
              </span>

              {/* Current odds for this side */}
              <span className="mono" style={{ fontSize: 12, color: "var(--ink-2)" }}>
                {sideOdds}%
              </span>

              {/* Potential payout if wins */}
              <span
                className="mono"
                style={{
                  fontSize: 13,
                  textAlign: "right",
                  color: row.encrypted ? "var(--ink-4)" : "var(--yes)",
                }}
              >
                {row.encrypted ? (
                  "--"
                ) : row.amount === 0 ? (
                  "0.00"
                ) : (
                  <>
                    +<CipherReveal value={profit.toFixed(2)} reveal={true} width={6} />
                  </>
                )}
              </span>
            </div>

            {/* Claim button for resolved */}
            {isResolved && i === rows.length - 1 && (
              <div style={{ padding: "8px 18px 12px", borderBottom: "1px solid var(--line)" }}>
                <ClaimButton marketAddress={marketAddress} />
              </div>
            )}
          </React.Fragment>
        );
      })}
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
  onAmountsReady,
}: {
  marketAddress: `0x${string}`;
  userAddress: `0x${string}`;
  autoDecrypt?: boolean;
  onAmountsReady?: (staked: number, potentialWin: number) => void;
}) {
  const hasPos = useHasPosition(marketAddress, userAddress);

  if (hasPos === true) {
    return (
      <PositionRow
        marketAddress={marketAddress}
        userAddress={userAddress}
        autoDecrypt={autoDecrypt}
        onAmountsReady={onAmountsReady}
      />
    );
  }

  return null;
}

/* ── Portfolio page ──────────────────────────────────────────── */
export default function PortfolioPage() {
  const { address, isConnected } = useAccount();
  const { allMarkets, isLoading: isMarketsLoading } = useFactoryMarkets();
  useNullCastStore((s) => s.positions);

  const [revealAll, setRevealAll] = useState(false);
  const [isDecryptingAll, setIsDecryptingAll] = useState(false);

  // Aggregate stats from decrypted positions
  const [revealedStats, setRevealedStats] = useState<Record<string, { staked: number; potentialWin: number }>>({});

  const handleAmountsReady = React.useCallback((market: string) => (staked: number, potentialWin: number) => {
    setRevealedStats((prev) => ({ ...prev, [market]: { staked, potentialWin } }));
  }, []);

  const { totalStaked, totalPotentialWin } = useMemo(() => {
    let staked = 0;
    let win = 0;
    Object.values(revealedStats).forEach((s) => {
      staked += s.staked;
      win += s.potentialWin;
    });
    return { totalStaked: staked, totalPotentialWin: win };
  }, [revealedStats]);

  const hasRevealed = Object.keys(revealedStats).length > 0;

  const handleRevealAll = () => {
    setRevealAll(true);
    setIsDecryptingAll(true);
    setTimeout(() => setIsDecryptingAll(false), 15000);
  };

  return (
    <div className="page-in" style={{ maxWidth: 1280, margin: "0 auto", padding: "44px 48px 80px" }}>
      {/* Header row */}
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 36 }}>
        <h1 className="serif" style={{ fontSize: 38, fontWeight: 500, letterSpacing: "-0.02em" }}>
          Portfolio
        </h1>
        <button
          onClick={handleRevealAll}
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
          {isDecryptingAll ? "Decrypting..." : revealAll ? "Revealed" : "Reveal all positions"}
        </button>
      </div>

      {/* Stats row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 48,
          paddingBottom: 32,
          borderBottom: "1px solid var(--line)",
        }}
      >
        <Stat label="Positions">
          {isMarketsLoading ? "..." : allMarkets.length}
        </Stat>
        <div>
          <div className="mono" style={{ fontSize: 34, fontWeight: 500, letterSpacing: "-0.02em", lineHeight: 1.1 }}>
            {hasRevealed ? (
              <CipherReveal value={totalStaked.toFixed(2)} reveal={true} width={8} />
            ) : (
              <span style={{ color: "var(--ink-4)" }}>
                {isDecryptingAll ? <span className="pulse-text">...</span> : "---"}
              </span>
            )}
          </div>
          <div style={{ marginTop: 6, fontSize: 10, color: "var(--ink-3)", letterSpacing: "0.12em", textTransform: "uppercase" }}>
            Total staked
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
              color: hasRevealed ? "var(--yes)" : "var(--ink-1)",
            }}
          >
            {hasRevealed ? (
              <>+<CipherReveal value={totalPotentialWin.toFixed(2)} reveal={true} width={8} /></>
            ) : (
              <span style={{ color: "var(--ink-4)" }}>
                {isDecryptingAll ? <span className="pulse-text">...</span> : "---"}
              </span>
            )}
          </div>
          <div style={{ marginTop: 6, fontSize: 10, color: "var(--ink-3)", letterSpacing: "0.12em", textTransform: "uppercase" }}>
            Potential winnings
          </div>
        </div>
      </div>

      {/* Note about potential winnings */}
      {hasRevealed && (
        <div style={{ marginTop: 12, fontSize: 11, color: "var(--ink-4)", fontStyle: "italic" }}>
          Potential winnings = payout if your side wins at current odds. Not guaranteed.
        </div>
      )}

      {/* Table */}
      <div style={{ marginTop: 28 }}>
        {/* Header row */}
        <div
          className="mono"
          style={{
            display: "grid",
            gridTemplateColumns: "2fr 60px 100px 80px 120px",
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
          <span>Staked</span>
          <span>Odds</span>
          <span style={{ textAlign: "right" }}>If wins</span>
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
              onAmountsReady={handleAmountsReady(addr)}
            />
          ))
        )}
      </div>
    </div>
  );
}
