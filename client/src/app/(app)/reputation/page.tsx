"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { useReputation } from "@/hooks/useReputation";
import { useMintCUSDT } from "@/hooks/useCUSDT";
import {
  LockIcon,
  LockOpenIcon,
  CheckIcon,
  ExternalIcon,
} from "@/components/shared/Icons";
import { Pill } from "@/components/shared/Icons";
import { TIERS, getTierFromScore } from "@/constants/tiers";

/* ── ScoreRing ─────────────────────────────────────────────────── */
function ScoreRing({
  state,
  score,
  participation,
  tierName,
  tierColor,
}: {
  state: "hidden" | "decrypting" | "revealed";
  score: number;
  participation: number;
  tierName: string | null;
  tierColor: string | null;
}) {
  const size = 220;
  const cx = size / 2;
  const cy = size / 2;
  const radius = 90;
  const strokeWidth = 10;
  const circumference = 2 * Math.PI * radius;

  const progress =
    state === "revealed"
      ? Math.min(score / 100, 1)
      : Math.min(participation / 20, 1);

  const dashOffset = circumference * (1 - progress);
  const strokeColor =
    state === "revealed" ? "var(--acc)" : "var(--enc)";

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* Track */}
      <circle
        cx={cx}
        cy={cy}
        r={radius}
        fill="none"
        stroke="var(--bg-3)"
        strokeWidth={strokeWidth}
      />
      {/* Dashed overlay when not revealed */}
      {state !== "revealed" && (
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke="var(--border-2)"
          strokeWidth={strokeWidth}
          strokeDasharray="4 8"
          opacity={0.5}
        />
      )}
      {/* Filled arc */}
      <circle
        cx={cx}
        cy={cy}
        r={radius}
        fill="none"
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={dashOffset}
        style={{
          transform: "rotate(-90deg)",
          transformOrigin: "50% 50%",
          transition: "stroke-dashoffset 1s ease-out",
        }}
      />
      {/* Center text */}
      {state === "hidden" && (
        <text
          x={cx}
          y={cy}
          textAnchor="middle"
          dominantBaseline="central"
          style={{
            fontFamily: "var(--f-mono)",
            fontSize: 20,
            fill: "var(--enc-hi)",
            letterSpacing: "0.2em",
          }}
        >
          {"\u2022\u2022\u2022\u2022\u2022"}
        </text>
      )}
      {state === "decrypting" && (
        <text
          x={cx}
          y={cy}
          textAnchor="middle"
          dominantBaseline="central"
          className="shimmer"
          style={{
            fontFamily: "var(--f-mono)",
            fontSize: 14,
            fill: "var(--enc-hi)",
          }}
        >
          decrypting...
        </text>
      )}
      {state === "revealed" && (
        <>
          <text
            x={cx}
            y={tierName ? cy - 16 : cy - 6}
            textAnchor="middle"
            dominantBaseline="central"
            style={{
              fontFamily: "var(--f-mono)",
              fontSize: 42,
              fontWeight: 600,
              fill: "var(--t-1)",
            }}
          >
            {score}
          </text>
          <text
            x={cx}
            y={tierName ? cy + 18 : cy + 28}
            textAnchor="middle"
            dominantBaseline="central"
            style={{
              fontFamily: "var(--f-mono)",
              fontSize: 13,
              fill: "var(--t-3)",
            }}
          >
            / 100
          </text>
          {tierName && (
            <text
              x={cx}
              y={cy + 42}
              textAnchor="middle"
              dominantBaseline="central"
              style={{
                fontFamily: "var(--f-mono)",
                fontSize: 14,
                fontWeight: 600,
                fill: tierColor ?? "var(--t-2)",
              }}
            >
              {tierName}
            </text>
          )}
        </>
      )}
    </svg>
  );
}

/* ── ProgressBar ───────────────────────────────────────────────── */
function ProgressBar({
  label,
  encrypted,
  value,
  max,
}: {
  label: string;
  pillLabel?: string;
  encrypted: boolean;
  value: number;
  max: number;
}) {
  const pct = Math.min((value / max) * 100, 100);

  return (
    <div style={{ marginBottom: 16 }}>
      <div className="row between" style={{ marginBottom: 6 }}>
        <div className="row gap-2">
          <span className="eyebrow">{label}</span>
          <Pill variant={encrypted ? "enc" : ""}>{encrypted ? "ENC" : "PUBLIC"}</Pill>
        </div>
        <span className="mono" style={{ fontSize: 12, color: "var(--t-2)" }}>
          {value}/{max}
        </span>
      </div>
      <div
        style={{
          width: "100%",
          height: 6,
          borderRadius: 999,
          background: "var(--bg-3)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            borderRadius: 999,
            background: encrypted
              ? "linear-gradient(90deg, var(--enc), var(--enc-hi))"
              : "linear-gradient(90deg, var(--acc), var(--acc-hi))",
            transition: "width 600ms ease-out",
          }}
        />
      </div>
    </div>
  );
}

/* ── Reputation page ─────────────────────────────────────────── */
export default function ReputationPage() {
  const { address, isConnected } = useAccount();
  const {
    hasScore,
    participation,
    lastUpdated,
    isLoading: isRepLoading,
  } = useReputation(address);

  const {
    mint,
    hash: mintHash,
    isWriting: isMintWriting,
    isConfirming: isMintConfirming,
    isConfirmed: isMintConfirmed,
    error: mintError,
  } = useMintCUSDT();

  const [scoreState, setScoreState] = useState<"hidden" | "decrypting" | "revealed">("hidden");

  const handleMint = () => {
    if (!address) return;
    mint(address, BigInt(10_000_000_000));
  };

  const handleDecryptScore = () => {
    if (scoreState !== "hidden") return;
    setScoreState("decrypting");
    setTimeout(() => setScoreState("revealed"), 1800);
  };

  const lastUpdatedDate = lastUpdated
    ? new Date(lastUpdated * 1000).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "Never";

  const eligibleMarkets = hasScore ? "All tiers" : "None";

  const demoScore = 72;
  const currentTier = scoreState === "revealed" && hasScore ? getTierFromScore(demoScore) : null;

  // Not connected
  if (!isConnected || !address) {
    return (
      <div className="page">
        <div className="container">
          <div className="page-head" style={{ padding: 0, marginBottom: 32 }}>
            <h1 style={{ fontSize: 36 }}>Reputation</h1>
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
              Connect your wallet to view your reputation
            </p>
            <p style={{ fontSize: 13, color: "var(--t-3)", maxWidth: 360 }}>
              Your reputation score is stored on-chain as an encrypted euint8. Only your wallet can decrypt it.
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
          <h1 style={{ fontSize: 36 }}>Reputation</h1>
          <p className="sub">
            Your score determines which markets you can access and position limits.
          </p>
        </div>

        {/* Faucet card */}
        <div className="card elevated" style={{ marginBottom: 24, padding: "20px 24px" }}>
          <div className="row between">
            <div>
              <div style={{ fontSize: 15, fontWeight: 600, color: "var(--t-1)", marginBottom: 2 }}>
                Get test cUSDT
              </div>
              <div className="mono" style={{ fontSize: 12, color: "var(--t-3)" }}>
                Mint tokens to your connected wallet
              </div>
            </div>
            <div className="row gap-4">
              {isMintConfirmed && (
                <span className="row gap-2" style={{ color: "var(--yes-hi)", fontSize: 13, fontWeight: 500 }}>
                  <CheckIcon size={14} />
                  Minted
                  {mintHash && (
                    <a
                      href={`https://sepolia.etherscan.io/tx/${mintHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalIcon size={12} />
                    </a>
                  )}
                </span>
              )}
              {mintError && (
                <span style={{ fontSize: 12, color: "var(--no-hi)" }}>
                  {mintError.message?.includes("User rejected") ? "Rejected" : "Failed"}
                </span>
              )}
              <button
                className="btn primary lg"
                onClick={handleMint}
                disabled={isMintWriting || isMintConfirming}
              >
                {isMintWriting
                  ? "Confirm..."
                  : isMintConfirming
                    ? (
                      <span className="shimmer">Minting...</span>
                    )
                    : "Mint 10,000 cUSDT"}
              </button>
            </div>
          </div>
        </div>

        {/* Loading */}
        {isRepLoading && (
          <div
            className="card row"
            style={{ justifyContent: "center", padding: "60px 20px", gap: 12 }}
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
            <span style={{ fontSize: 13, color: "var(--t-2)" }}>Loading reputation data...</span>
          </div>
        )}

        {/* Main content */}
        {!isRepLoading && (
          <>
          <div style={{ display: "grid", gridTemplateColumns: "380px 1fr", gap: 24 }}>
            {/* Left: score gauge */}
            <div className="card elevated">
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  padding: "32px 24px 24px",
                  gap: 16,
                }}
              >
                <span className="eyebrow">Your score</span>

                <ScoreRing
                  state={scoreState}
                  score={hasScore ? demoScore : 0}
                  participation={participation}
                  tierName={currentTier?.name ?? null}
                  tierColor={currentTier?.color ?? null}
                />

                <button
                  className="btn secondary"
                  onClick={handleDecryptScore}
                  disabled={scoreState !== "hidden" || !hasScore}
                >
                  <LockOpenIcon size={14} />
                  Decrypt score
                </button>

                <div style={{ fontSize: 12, color: "var(--t-3)", textAlign: "center" }}>
                  {hasScore ? (
                    <>Eligible for: <span className="mono" style={{ color: "var(--t-2)" }}>{eligibleMarkets}</span></>
                  ) : (
                    "No score recorded yet"
                  )}
                </div>
              </div>
            </div>

            {/* Right: breakdown */}
            <div className="card">
              <div className="card-head">
                <h3>Score breakdown</h3>
                <span className="eyebrow">
                  Updated {lastUpdatedDate}
                </span>
              </div>
              <div className="card-body" style={{ padding: 20 }}>
                <ProgressBar
                  label="Participation"
                  pillLabel="PUBLIC"
                  encrypted={false}
                  value={participation}
                  max={20}
                />
                <ProgressBar
                  label="Wallet age"
                  pillLabel="ENC"
                  encrypted={true}
                  value={hasScore ? 1 : 0}
                  max={1}
                />
                <ProgressBar
                  label="Tx history"
                  pillLabel="ENC"
                  encrypted={true}
                  value={hasScore ? 1 : 0}
                  max={1}
                />
                <ProgressBar
                  label="Resolution accuracy"
                  pillLabel="ENC"
                  encrypted={true}
                  value={hasScore ? 1 : 0}
                  max={1}
                />

                <hr className="divider" style={{ margin: "16px 0" }} />

                <div>
                  <span className="eyebrow" style={{ display: "block", marginBottom: 8 }}>
                    How it works
                  </span>
                  <p style={{ fontSize: 12, color: "var(--t-3)", lineHeight: 1.6, margin: 0 }}>
                    Reputation is derived from on-chain signals only. No KYC required.
                    The score is stored as an encrypted euint8 in the ReputationGate contract.
                    Participation count is the only publicly readable metric.
                    The encrypted score determines your access tier and max position sizes.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Reputation Tiers */}
          <div className="card" style={{ marginTop: 24 }}>
            <div className="card-head">
              <h3>Tiers</h3>
            </div>
            <div className="card-body" style={{ padding: 0 }}>
              {TIERS.map((tier, i) => {
                const isActive = currentTier?.name === tier.name;
                return (
                  <div
                    key={tier.name}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 14,
                      padding: "14px 20px",
                      borderBottom: i < TIERS.length - 1 ? "1px solid var(--border-1)" : "none",
                      background: isActive ? "var(--bg-2)" : "transparent",
                    }}
                  >
                    {/* Colored dot */}
                    <span
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: "50%",
                        background: tier.color,
                        flexShrink: 0,
                        boxShadow: isActive ? `0 0 8px ${tier.color}` : "none",
                      }}
                    />
                    {/* Tier name */}
                    <span
                      style={{
                        fontWeight: 600,
                        fontSize: 14,
                        color: isActive ? tier.color : "var(--t-1)",
                        width: 100,
                      }}
                    >
                      {tier.name}
                    </span>
                    {/* Threshold */}
                    <span
                      className="mono"
                      style={{
                        fontSize: 12,
                        color: "var(--t-3)",
                        width: 40,
                      }}
                    >
                      {"\u2265"} {tier.threshold}
                    </span>
                    {/* Description */}
                    <span
                      style={{
                        fontSize: 13,
                        color: "var(--t-3)",
                        flex: 1,
                      }}
                    >
                      {tier.name === "Oracle" && "Top performers"}
                      {tier.name === "Strategist" && "Proven track record"}
                      {tier.name === "Analyst" && "Regular participant"}
                      {tier.name === "Explorer" && "Basic activity"}
                    </span>
                    {/* Active indicator */}
                    {isActive && (
                      <Pill variant="acc">YOU</Pill>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          </>
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
