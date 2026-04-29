"use client";

import React, { useState, useMemo } from "react";
import { useAccount } from "wagmi";
import { useFactoryMarkets } from "@/hooks/useFactory";
import { useMarket, useHasPosition } from "@/hooks/useMarket";
import { useClaimWinnings } from "@/hooks/useClaimWinnings";
import { useUserDecrypt as __useUserDecrypt } from "@/hooks/useUserDecrypt";
import { useNullCastStore } from "@/lib/store";
import { RevealNumber } from "@/components/nc/RevealNumber";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/nc/EmptyState";
import { Eye, Check } from "lucide-react";

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
  const { question, status, yesOdds, noOdds, isLoading: isMarketLoading } = useMarket(marketAddress);
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

  const reportedRef = React.useRef(false);
  React.useEffect(() => {
    if (isDecrypted && onAmountsReady && !reportedRef.current) {
      reportedRef.current = true;
      const staked = yesNum + noNum;
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

  return (
    <>
      {rows.map((row, i) => {
        const sideOdds = row.side === "YES" ? currentYesOdds : currentNoOdds;
        const payout = !row.encrypted && sideOdds > 0 ? row.amount * (100 / sideOdds) : 0;
        const profit = payout - row.amount;

        return (
          <React.Fragment key={`${marketAddress}-${row.side}-${i}`}>
            <div className="grid grid-cols-[2fr_60px_100px_80px_120px] items-center px-4 py-4 border-b border-subtle hover:bg-surface-1 transition-colors cursor-pointer">
              {/* Market name */}
              <span className="font-display text-[15px] text-fg tracking-tight truncate pr-4">
                {isMarketLoading ? "Loading..." : question ?? "Unknown market"}
              </span>

              {/* Side indicator */}
              <span className="flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${row.side === "YES" ? "bg-yes" : "bg-no"}`} />
                <span className={`font-mono text-[11px] ${row.side === "YES" ? "text-yes" : "text-no"}`}>
                  {row.side}
                </span>
              </span>

              {/* Staked amount */}
              <span className="font-mono text-[13px] text-fg">
                {row.encrypted ? (
                  <span className="text-fg-4 text-[11px] tracking-wider">
                    {isDecrypting ? <span className="animate-pulse">decrypting</span> : "encrypted"}
                  </span>
                ) : (
                  <RevealNumber value={row.amount.toFixed(2)} revealed={true} />
                )}
              </span>

              {/* Current odds */}
              <span className="font-mono text-xs text-fg-2">{sideOdds}%</span>

              {/* Potential payout */}
              <span className={`font-mono text-[13px] text-right ${row.encrypted ? "text-fg-4" : "text-yes"}`}>
                {row.encrypted ? "--" : row.amount === 0 ? "0.00" : (
                  <RevealNumber value={`+${profit.toFixed(2)}`} revealed={true} />
                )}
              </span>
            </div>

            {isResolved && i === rows.length - 1 && (
              <div className="px-4 py-2 border-b border-subtle">
                <ClaimButton marketAddress={marketAddress} />
              </div>
            )}
          </React.Fragment>
        );
      })}
    </>
  );
}

/* ── Claim button ───────────────────────── */
function ClaimButton({ marketAddress }: { marketAddress: `0x${string}` }) {
  const { claimWinnings, isWriting, isConfirming, isConfirmed } = useClaimWinnings(marketAddress);

  if (isConfirmed) {
    return (
      <span className="text-yes text-xs font-medium flex items-center gap-1">
        <Check className="w-3 h-3" /> Claimed
      </span>
    );
  }

  return (
    <Button variant="primary" size="sm" onClick={claimWinnings} disabled={isWriting || isConfirming}>
      {isWriting ? "Confirm..." : isConfirming ? "Claiming..." : "Claim"}
    </Button>
  );
}

/* ── Wrapper that checks hasPosition ─────── */
function MarketPositionCheck({
  marketAddress, userAddress, autoDecrypt, onAmountsReady,
}: {
  marketAddress: `0x${string}`;
  userAddress: `0x${string}`;
  autoDecrypt?: boolean;
  onAmountsReady?: (staked: number, potentialWin: number) => void;
}) {
  const hasPos = useHasPosition(marketAddress, userAddress);
  if (hasPos === true) {
    return <PositionRow marketAddress={marketAddress} userAddress={userAddress} autoDecrypt={autoDecrypt} onAmountsReady={onAmountsReady} />;
  }
  return null;
}

/* ── Portfolio page ──────────────────────── */
export default function PortfolioPage() {
  const { address, isConnected } = useAccount();
  const { allMarkets, isLoading: isMarketsLoading } = useFactoryMarkets();
  useNullCastStore((s) => s.positions);

  const [revealAll, setRevealAll] = useState(false);
  const [isDecryptingAll, setIsDecryptingAll] = useState(false);
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
    <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-8 sm:py-10 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
        <div>
          <span className="section-numeral text-xl sm:text-2xl">§ Portfolio</span>
          <h1 className="font-display text-3xl sm:text-4xl text-fg mt-1">Your sealed hand</h1>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRevealAll}
          disabled={revealAll || !isConnected || !address}
          className={revealAll ? "text-fg-3 border-subtle" : "text-primary border-primary/30"}
        >
          <Eye className="w-3 h-3" />
          {isDecryptingAll ? "Decrypting..." : revealAll ? "Revealed" : "Reveal all positions"}
        </Button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-8 sm:gap-12 pb-8 border-b border-subtle">
        <div>
          <div className="font-mono tnum text-4xl font-medium tracking-tight leading-none text-fg">
            {isMarketsLoading ? "..." : allMarkets.length}
          </div>
          <div className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-fg-3">Positions</div>
        </div>
        <div>
          <div className="font-mono tnum text-4xl font-medium tracking-tight leading-none text-fg">
            {hasRevealed ? (
              <RevealNumber value={totalStaked.toFixed(2)} revealed={true} />
            ) : (
              <span className="text-fg-4">{isDecryptingAll ? <span className="animate-pulse">...</span> : "---"}</span>
            )}
          </div>
          <div className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-fg-3">Total staked</div>
        </div>
        <div>
          <div className={`font-mono tnum text-4xl font-medium tracking-tight leading-none ${hasRevealed ? "text-yes" : "text-fg"}`}>
            {hasRevealed ? (
              <>+<RevealNumber value={totalPotentialWin.toFixed(2)} revealed={true} /></>
            ) : (
              <span className="text-fg-4">{isDecryptingAll ? <span className="animate-pulse">...</span> : "---"}</span>
            )}
          </div>
          <div className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-fg-3">Potential winnings</div>
        </div>
      </div>

      {hasRevealed && (
        <div className="mt-3 text-[11px] text-fg-4 italic font-display">
          Potential winnings = payout if your side wins at current odds. Not guaranteed.
        </div>
      )}

      {/* Table */}
      <div className="mt-7">
        <div className="grid grid-cols-[2fr_60px_100px_80px_120px] px-4 py-2.5 font-mono text-[9px] text-fg-4 tracking-[0.16em] uppercase border-b border-subtle">
          <span>Market</span>
          <span>Side</span>
          <span>Staked</span>
          <span>Odds</span>
          <span className="text-right">If wins</span>
        </div>

        {!isConnected || !address ? (
          <EmptyState title="Connect wallet" body="Connect your wallet to view your encrypted positions." />
        ) : isMarketsLoading ? (
          <div className="py-16 text-center text-fg-3 text-sm">Loading markets...</div>
        ) : allMarkets.length === 0 ? (
          <EmptyState title="No positions yet" body="Place a bet to see your sealed positions here." />
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
