"use client";

import React, { useState, useEffect, useRef } from "react";
import { useAccount } from "wagmi";
import { useReputation } from "@/hooks/useReputation";
import { useMintCUSDT } from "@/hooks/useCUSDT";
import { Icon } from "@/components/shared/Icons";
import { getTierFromScore } from "@/constants/tiers";

/* ── Score page (reputation) ─────────────────────────────────── */
export default function ScorePage() {
  const { address, isConnected } = useAccount();
  const {
    hasScore,
    participation,
    isLoading: isRepLoading,
  } = useReputation(address);

  const {
    mint,
    isWriting: isMintWriting,
    isConfirming: isMintConfirming,
    isConfirmed: isMintConfirmed,
  } = useMintCUSDT();

  const handleMint = () => {
    if (!address) return;
    mint(address, BigInt(10_000_000_000));
  };

  /* ── Score animation ───────────────────────────────────────── */
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

  /* ── Tier info ─────────────────────────────────────────────── */
  const currentTier = hasScore ? getTierFromScore(demoScore) : null;
  const tierNames = ["Explorer", "Analyst", "Strategist", "Oracle"];
  const tierIndex = currentTier
    ? tierNames.indexOf(currentTier.name)
    : -1;

  /* ── Score components (synthetic from on-chain data) ────────── */
  const components = [
    { label: "Participation", value: participation, unit: "", bar: Math.min(participation / 20 * 100, 100) },
    { label: "Wallet age", value: hasScore ? 1 : 0, unit: "", bar: hasScore ? 100 : 0 },
    { label: "Tx history", value: hasScore ? 1 : 0, unit: "", bar: hasScore ? 80 : 0 },
    { label: "Resolution accuracy", value: hasScore ? 1 : 0, unit: "", bar: hasScore ? 60 : 0 },
  ];

  if (isRepLoading) {
    return (
      <div className="page-in" style={{ maxWidth: 980, margin: "0 auto", padding: "44px 48px 80px" }}>
        <div style={{ textAlign: "center", padding: "60px 20px", color: "var(--ink-3)", fontSize: 13 }}>
          Loading reputation data...
        </div>
      </div>
    );
  }

  return (
    <div className="page-in" style={{ maxWidth: 980, margin: "0 auto", padding: "44px 48px 80px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 36 }}>
        <h1 className="serif" style={{ fontSize: 38, fontWeight: 500, letterSpacing: "-0.02em" }}>
          Score
        </h1>
        <button
          onClick={handleMint}
          disabled={!isConnected || !address || isMintWriting || isMintConfirming}
          style={{
            fontSize: 11,
            padding: "7px 12px",
            border: "1px solid var(--line-2)",
            borderRadius: 3,
            color: isMintConfirmed ? "var(--yes)" : "var(--ink-2)",
            display: "flex",
            alignItems: "center",
            gap: 6,
            background: "transparent",
            cursor: "pointer",
          }}
        >
          <Icon name="plus" size={11} />
          {isMintWriting ? "Confirm..." : isMintConfirming ? "Minting..." : isMintConfirmed ? "Minted" : "Mint test cUSDT"}
        </button>
      </div>

      {/* Hero score ring */}
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 48 }}>
        <div style={{ position: "relative", width: 220, height: 220 }}>
          <svg width="220" height="220" viewBox="0 0 200 200">
            <circle cx="100" cy="100" r="80" fill="none" stroke="var(--line-2)" strokeWidth="1.5" />
            <circle
              cx="100" cy="100" r="80" fill="none"
              stroke="var(--gold)" strokeWidth="2"
              strokeDasharray={`${C * progress} ${C}`}
              transform="rotate(-90 100 100)"
              strokeLinecap="round"
              style={{
                transition: "stroke-dasharray 1200ms cubic-bezier(0.22, 1, 0.36, 1)",
                filter: "drop-shadow(0 0 8px rgba(212,168,67,0.4))",
              }}
            />
          </svg>
          <div style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}>
            <div className="mono" style={{
              fontSize: 64,
              color: "var(--gold)",
              fontWeight: 500,
              letterSpacing: "-0.03em",
              lineHeight: 1,
            }}>
              {animatedScore}
            </div>
            <div className="mono" style={{
              fontSize: 10,
              color: "var(--ink-3)",
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              marginTop: 8,
            }}>
              {currentTier?.name ?? "Unranked"}
            </div>
          </div>
        </div>
      </div>

      {/* Tier scale */}
      <div style={{ marginBottom: 56 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 4, marginBottom: 10 }}>
          {tierNames.map((t, i) => (
            <div
              key={t}
              style={{
                height: 4,
                borderRadius: 1,
                background: i <= tierIndex ? "var(--gold)" : "var(--bg-3)",
                opacity: i === tierIndex ? 1 : i < tierIndex ? 0.7 : 1,
              }}
            />
          ))}
        </div>
        <div
          className="mono"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 4,
            fontSize: 10,
            color: "var(--ink-3)",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
          }}
        >
          {tierNames.map((t, i) => (
            <span key={t} style={{ color: i === tierIndex ? "var(--gold)" : "var(--ink-3)" }}>
              {t}
            </span>
          ))}
        </div>
      </div>

      {/* Components — progress bars */}
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        {components.map((c) => (
          <div key={c.label}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
              <span style={{ fontSize: 13, color: "var(--ink-1)" }}>{c.label}</span>
              <span className="mono" style={{ fontSize: 13, color: "var(--ink-1)" }}>
                {c.value}{c.unit}
              </span>
            </div>
            <div style={{ height: 4, borderRadius: 1, background: "var(--bg-3)", overflow: "hidden" }}>
              <div
                style={{
                  width: `${c.bar}%`,
                  height: "100%",
                  background: "linear-gradient(90deg, var(--gold-dim), var(--gold))",
                  transition: "width 600ms ease-out",
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
