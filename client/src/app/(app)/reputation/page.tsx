"use client";

import React, { useState, useEffect, useRef } from "react";
import { useAccount } from "wagmi";
import { useReputation } from "@/hooks/useReputation";
import { useMintCUSDT } from "@/hooks/useCUSDT";
import { getTierFromScore } from "@/constants/tiers";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default function ScorePage() {
  const { address, isConnected } = useAccount();
  const { hasScore, participation, isLoading: isRepLoading } = useReputation(address);
  const { mint, isWriting: isMintWriting, isConfirming: isMintConfirming, isConfirmed: isMintConfirmed } = useMintCUSDT();

  const handleMint = () => {
    if (!address) return;
    mint(address, BigInt(10_000_000_000));
  };

  const demoScore = hasScore ? 72 : 0;
  const [animatedScore, setAnimatedScore] = useState(0);

  const hasAnimated = useRef(false);
  useEffect(() => {
    if (isRepLoading || hasAnimated.current) return;
    hasAnimated.current = true;
    const start = performance.now();
    const D = 1200;
    let raf: number;
    function tick(now: number) {
      const t = Math.min(1, (now - start) / D);
      const eased = 1 - Math.pow(1 - t, 3);
      setAnimatedScore(Math.round(demoScore * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isRepLoading, demoScore]);

  const C = 2 * Math.PI * 80;
  const progress = demoScore / 100;

  const currentTier = hasScore ? getTierFromScore(demoScore) : null;
  const tierNames = ["Explorer", "Analyst", "Strategist", "Oracle"];
  const tierIndex = currentTier ? tierNames.indexOf(currentTier.name) : -1;

  const components = [
    { label: "Participation", value: participation, bar: Math.min(participation / 20 * 100, 100) },
    { label: "Wallet age", value: hasScore ? 1 : 0, bar: hasScore ? 100 : 0 },
    { label: "Tx history", value: hasScore ? 1 : 0, bar: hasScore ? 80 : 0 },
    { label: "Resolution accuracy", value: hasScore ? 1 : 0, bar: hasScore ? 60 : 0 },
  ];

  if (isRepLoading) {
    return (
      <div className="max-w-[980px] mx-auto px-4 sm:px-6 py-8 sm:py-10 animate-fade-in">
        <div className="py-16 text-center text-fg-3 text-sm">Loading reputation data...</div>
      </div>
    );
  }

  return (
    <div className="max-w-[980px] mx-auto px-4 sm:px-6 py-8 sm:py-10 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
        <div>
          <span className="section-numeral text-xl sm:text-2xl">§ Score</span>
          <h1 className="font-display text-3xl sm:text-4xl text-fg mt-1">Your reputation</h1>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleMint}
          disabled={!isConnected || !address || isMintWriting || isMintConfirming}
          className={isMintConfirmed ? "text-yes border-yes/30" : ""}
        >
          <Plus className="w-3 h-3" />
          {isMintWriting ? "Confirm..." : isMintConfirming ? "Minting..." : isMintConfirmed ? "Minted" : "Mint test cUSDT"}
        </Button>
      </div>

      {/* Hero score ring */}
      <div className="flex justify-center mb-12">
        <div className="relative w-[220px] h-[220px]">
          <svg width="220" height="220" viewBox="0 0 200 200">
            <circle cx="100" cy="100" r="80" fill="none" stroke="hsl(var(--border) / 0.08)" strokeWidth="1.5" />
            <circle
              cx="100" cy="100" r="80" fill="none"
              stroke="hsl(var(--primary))" strokeWidth="2"
              strokeDasharray={`${C * progress} ${C}`}
              transform="rotate(-90 100 100)"
              strokeLinecap="round"
              className="transition-all duration-[1200ms] ease-out"
              style={{ filter: "drop-shadow(0 0 8px hsl(var(--primary) / 0.4))" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="font-mono tnum text-[64px] text-primary font-medium tracking-tighter leading-none">
              {animatedScore}
            </div>
            <div className="font-mono text-[10px] text-fg-3 tracking-[0.2em] uppercase mt-2">
              {currentTier?.name ?? "Unranked"}
            </div>
          </div>
        </div>
      </div>

      {/* Tier scale */}
      <div className="mb-14">
        <div className="grid grid-cols-4 gap-1 mb-2.5">
          {tierNames.map((t, i) => (
            <div
              key={t}
              className={`h-1 rounded-sm transition-colors ${
                i <= tierIndex ? "bg-primary" : "bg-surface-3"
              } ${i < tierIndex ? "opacity-70" : ""}`}
            />
          ))}
        </div>
        <div className="grid grid-cols-4 gap-1 font-mono text-[10px] tracking-[0.1em] uppercase">
          {tierNames.map((t, i) => (
            <span key={t} className={i === tierIndex ? "text-primary" : "text-fg-3"}>
              {t}
            </span>
          ))}
        </div>
      </div>

      {/* Components — progress bars */}
      <div className="space-y-5">
        {components.map((c) => (
          <div key={c.label}>
            <div className="flex justify-between items-baseline mb-2">
              <span className="text-[13px] text-fg">{c.label}</span>
              <span className="font-mono text-[13px] text-fg">{c.value}</span>
            </div>
            <div className="h-1 rounded-sm bg-surface-3 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary/60 to-primary rounded-sm transition-[width] duration-500 ease-out"
                style={{ width: `${c.bar}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
