"use client";

import { IconInfo, IconSparkle } from "@/components/shared/Icons";

/* ── ScoreRing component ──────────────────────────────────────── */
interface ScoreRingProps {
  score: number;
  max?: number;
}

function ScoreRing({ score, max = 100 }: ScoreRingProps) {
  const size = 180;
  const radius = 72;
  const strokeWidth = 8;
  const circumference = 2 * Math.PI * radius;
  const progress = score / max;
  const dashOffset = circumference * (1 - progress);

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={{ display: "block" }}
    >
      {/* Track circle */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="var(--color-bg-input)"
        strokeWidth={strokeWidth}
      />
      {/* Progress arc */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="var(--color-accent)"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={dashOffset}
        style={{
          transform: "rotate(-90deg)",
          transformOrigin: "50% 50%",
          transition: "stroke-dashoffset 1s var(--ease-out)",
        }}
      />
      {/* Score number */}
      <text
        x={size / 2}
        y={size / 2 - 4}
        textAnchor="middle"
        dominantBaseline="central"
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 36,
          fontWeight: 600,
          fill: "var(--color-text-primary)",
        }}
      >
        {score}
      </text>
      {/* "/100" label */}
      <text
        x={size / 2}
        y={size / 2 + 24}
        textAnchor="middle"
        dominantBaseline="central"
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 13,
          fill: "var(--color-text-tertiary)",
        }}
      >
        / {max}
      </text>
    </svg>
  );
}

/* ── ProgressBar component ────────────────────────────────────── */
interface ProgressBarProps {
  label: string;
  subText: string;
  value: number;
  max: number;
}

function ProgressBar({ label, subText, value, max }: ProgressBarProps) {
  const pct = Math.min((value / max) * 100, 100);

  return (
    <div style={{ marginBottom: 20 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          marginBottom: 6,
        }}
      >
        <div>
          <span
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: "var(--color-text-primary)",
            }}
          >
            {label}
          </span>
          <span
            style={{
              fontSize: 12,
              color: "var(--color-text-tertiary)",
              marginLeft: 8,
            }}
          >
            {subText}
          </span>
        </div>
        <span
          className="mono"
          style={{
            fontSize: 12,
            color: "var(--color-text-secondary)",
          }}
        >
          {value}/{max}
        </span>
      </div>
      <div
        style={{
          width: "100%",
          height: 6,
          borderRadius: 999,
          background: "var(--color-bg-input)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            borderRadius: 999,
            background: "var(--color-accent)",
            transition: "width 600ms var(--ease-out)",
          }}
        />
      </div>
    </div>
  );
}

/* ── Reputation page ──────────────────────────────────────────── */
export default function ReputationPage() {
  const score = 72;
  const eligibleMarkets = 134;

  return (
    <div className="container" style={{ paddingTop: 48, paddingBottom: 80 }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 className="display" style={{ fontSize: 36, letterSpacing: "-0.04em" }}>
          Reputation
        </h1>
        <p
          style={{
            fontSize: 13,
            color: "var(--color-text-secondary)",
            marginTop: 8,
          }}
        >
          Your score determines which markets you can access and your borrowing limits.
        </p>
      </div>

      {/* 2-col grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "360px 1fr",
          gap: 24,
        }}
      >
        {/* Left column — score ring */}
        <div
          className="card card-elevated"
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            padding: "40px 24px 32px",
            gap: 16,
          }}
        >
          <ScoreRing score={score} />

          <div
            style={{
              textAlign: "center",
              marginTop: 8,
            }}
          >
            <div
              style={{
                fontSize: 13,
                color: "var(--color-text-tertiary)",
                fontWeight: 500,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              Your score
            </div>
            <div
              style={{
                fontSize: 13,
                color: "var(--color-text-secondary)",
                marginTop: 4,
              }}
            >
              Eligible for{" "}
              <span
                className="mono"
                style={{ color: "var(--color-accent-bright)" }}
              >
                {eligibleMarkets}
              </span>{" "}
              markets
            </div>
          </div>

          <button className="btn btn-secondary" style={{ marginTop: 8 }}>
            <IconSparkle size={14} />
            Refresh score
          </button>
        </div>

        {/* Right column — breakdown */}
        <div className="card" style={{ padding: 28 }}>
          <h2
            className="display"
            style={{
              fontSize: 17,
              fontWeight: 600,
              letterSpacing: "-0.02em",
              marginBottom: 24,
            }}
          >
            Score breakdown
          </h2>

          <ProgressBar
            label="Wallet age"
            subText="2.4 years"
            value={22}
            max={25}
          />
          <ProgressBar
            label="Transaction history"
            subText="847 txs"
            value={18}
            max={25}
          />
          <ProgressBar
            label="NullCast settled"
            subText="12 markets"
            value={20}
            max={30}
          />
          <ProgressBar
            label="Resolution accuracy"
            subText="78% correct"
            value={12}
            max={20}
          />

          {/* Info box */}
          <div
            style={{
              marginTop: 24,
              padding: 16,
              borderRadius: 10,
              background: "var(--color-accent-muted)",
              border: "1px solid rgba(61, 123, 255, 0.12)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                marginBottom: 8,
              }}
            >
              <IconInfo size={14} stroke="var(--color-accent-bright)" />
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: "var(--color-accent-bright)",
                }}
              >
                How this is computed
              </span>
            </div>
            <p
              style={{
                fontSize: 12,
                lineHeight: 1.6,
                color: "var(--color-text-secondary)",
              }}
            >
              Your reputation score is derived from on-chain signals only. No KYC is
              required. The score is recomputed once per epoch (~7 days) and determines
              your access tier for gated markets and maximum position sizes.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
