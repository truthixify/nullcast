"use client";

import { useAccount } from "wagmi";
import { useReputation } from "@/hooks/useReputation";
import { useMintCUSDT } from "@/hooks/useCUSDT";
import {
  IconInfo,
  IconCheck,
  IconExternal,
  IconWallet,
  LockIcon,
  IconBolt,
} from "@/components/shared/Icons";

/* ── ScoreRing component (encrypted mode) ───────────────────── */
interface ScoreRingProps {
  encrypted?: boolean;
  participation: number;
}

function ScoreRing({ encrypted = true, participation }: ScoreRingProps) {
  const size = 180;
  const radius = 72;
  const strokeWidth = 8;
  const circumference = 2 * Math.PI * radius;
  // When encrypted, show a subtle partial ring based on participation count
  const estimatedProgress = Math.min(participation / 20, 1);
  const dashOffset = circumference * (1 - estimatedProgress);

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
        stroke={encrypted ? "var(--color-privacy)" : "var(--color-accent)"}
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
      {/* Score display */}
      {encrypted ? (
        <>
          <text
            x={size / 2}
            y={size / 2 - 6}
            textAnchor="middle"
            dominantBaseline="central"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 18,
              fontWeight: 500,
              fill: "var(--color-privacy-text)",
              letterSpacing: "0.15em",
            }}
          >
            encrypted
          </text>
          <text
            x={size / 2}
            y={size / 2 + 18}
            textAnchor="middle"
            dominantBaseline="central"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              fill: "var(--color-text-tertiary)",
            }}
          >
            euint8
          </text>
        </>
      ) : (
        <>
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
            --
          </text>
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
            / 100
          </text>
        </>
      )}
    </svg>
  );
}

/* ── ProgressBar component ──────────────────────────────────── */
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
          style={{ fontSize: 12, color: "var(--color-text-secondary)" }}
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

  const handleMint = () => {
    if (!address) return;
    // Mint 10,000 cUSDT (6 decimals)
    mint(address, BigInt(10_000_000_000));
  };

  const lastUpdatedDate = lastUpdated
    ? new Date(lastUpdated * 1000).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "Never";

  // Not connected state
  if (!isConnected || !address) {
    return (
      <div className="container" style={{ paddingTop: 48, paddingBottom: 80 }}>
        <div style={{ marginBottom: 32 }}>
          <h1 className="display" style={{ fontSize: 36, letterSpacing: "-0.04em" }}>
            Reputation
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
          <p style={{ fontSize: 15, fontWeight: 500, color: "var(--color-text-secondary)" }}>
            Connect your wallet to view your reputation
          </p>
          <p
            style={{
              fontSize: 13,
              color: "var(--color-text-tertiary)",
              maxWidth: 360,
              lineHeight: 1.5,
            }}
          >
            Your reputation score is stored on-chain as an encrypted value (euint8). Only your wallet can decrypt it.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ paddingTop: 48, paddingBottom: 80 }}>
      {/* Faucet card — prominent at top */}
      <div
        className="card card-elevated"
        style={{
          padding: "24px 28px",
          marginBottom: 24,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "linear-gradient(135deg, var(--color-accent-muted) 0%, var(--color-bg-card) 100%)",
          border: "1px solid rgba(61, 123, 255, 0.15)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: "var(--color-accent-muted)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <IconBolt size={22} stroke="var(--color-accent-bright)" />
          </div>
          <div>
            <div
              style={{
                fontSize: 15,
                fontWeight: 600,
                color: "var(--color-text-primary)",
                marginBottom: 2,
              }}
            >
              Test Token Faucet
            </div>
            <div style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>
              Mint 10,000 cUSDT to your wallet for testing
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {isMintConfirmed && (
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
              <IconCheck size={14} stroke="var(--color-yes-text)" />
              Minted!
              {mintHash && (
                <a
                  href={`https://sepolia.etherscan.io/tx/${mintHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ marginLeft: 4 }}
                >
                  <IconExternal size={12} stroke="var(--color-yes-text)" />
                </a>
              )}
            </span>
          )}
          {mintError && (
            <span style={{ fontSize: 12, color: "var(--color-no-text)" }}>
              {mintError.message?.includes("User rejected") ? "Rejected" : "Failed"}
            </span>
          )}
          <button
            className="btn btn-primary"
            onClick={handleMint}
            disabled={isMintWriting || isMintConfirming}
            style={{
              opacity: isMintWriting || isMintConfirming ? 0.6 : 1,
            }}
          >
            {isMintWriting
              ? "Confirm..."
              : isMintConfirming
                ? "Minting..."
                : "Mint cUSDT"}
          </button>
        </div>
      </div>

      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 className="display" style={{ fontSize: 36, letterSpacing: "-0.04em" }}>
          Reputation
        </h1>
        <p style={{ fontSize: 13, color: "var(--color-text-secondary)", marginTop: 8 }}>
          Your score determines which markets you can access and your borrowing limits.
        </p>
      </div>

      {/* Loading state */}
      {isRepLoading && (
        <div
          className="card"
          style={{
            padding: "60px 20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
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
            Loading reputation data...
          </span>
        </div>
      )}

      {/* Main content */}
      {!isRepLoading && (
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
            <ScoreRing encrypted={true} participation={participation} />

            <div style={{ textAlign: "center", marginTop: 8 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  fontSize: 13,
                  color: "var(--color-privacy-text)",
                  fontWeight: 500,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                }}
              >
                <LockIcon size={12} stroke="var(--color-privacy)" />
                Score is encrypted (euint8)
              </div>
              <div style={{ fontSize: 13, color: "var(--color-text-secondary)", marginTop: 6 }}>
                {hasScore ? (
                  "Score exists on-chain. Decrypt via FHEVM SDK."
                ) : (
                  <span style={{ color: "var(--color-text-tertiary)" }}>
                    No score recorded yet
                  </span>
                )}
              </div>
            </div>

            <div
              style={{
                marginTop: 8,
                padding: "10px 16px",
                borderRadius: 8,
                background: "var(--color-bg-input)",
                fontSize: 12,
                color: "var(--color-text-tertiary)",
                textAlign: "center",
                lineHeight: 1.5,
              }}
            >
              To decrypt your score, use the FHEVM SDK with your wallet to request a decryption proof from the gateway.
            </div>
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
              On-chain data
            </h2>

            <ProgressBar
              label="Market participation"
              subText={`${participation} market(s)`}
              value={participation}
              max={20}
            />

            <ProgressBar
              label="Has score"
              subText={hasScore ? "Yes" : "No"}
              value={hasScore ? 1 : 0}
              max={1}
            />

            <ProgressBar
              label="Last updated"
              subText={lastUpdatedDate}
              value={lastUpdated ? 1 : 0}
              max={1}
            />

            {/* Encrypted score note */}
            <div
              style={{
                marginTop: 8,
                padding: "14px 16px",
                borderRadius: 10,
                background: "var(--color-bg-input)",
                border: "1px solid var(--color-border-subtle)",
                display: "flex",
                alignItems: "flex-start",
                gap: 10,
              }}
            >
              <LockIcon size={16} stroke="var(--color-privacy)" style={{ marginTop: 1 }} />
              <div>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 500,
                    color: "var(--color-text-secondary)",
                    marginBottom: 4,
                  }}
                >
                  Score breakdown is encrypted
                </div>
                <p style={{ fontSize: 12, color: "var(--color-text-tertiary)", lineHeight: 1.5 }}>
                  Individual score components (wallet age, transaction history, resolution accuracy) are stored as encrypted values on-chain. The breakdown shown above reflects only publicly readable data (participation count, score existence, last update timestamp).
                </p>
              </div>
            </div>

            {/* Info box */}
            <div
              style={{
                marginTop: 16,
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
                required. The score is stored as an encrypted euint8 in the ReputationGate
                contract. Market participation is the only publicly readable metric. The
                encrypted score determines your access tier for gated markets and maximum
                position sizes.
              </p>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
