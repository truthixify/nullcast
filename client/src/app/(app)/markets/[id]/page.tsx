"use client";

import { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { useAccount, useReadContract } from "wagmi";
import {
  FHEBadge,
  LockIcon,
  IconChevronLeft,
  IconClock,
  IconCheck,
  IconShield,
  IconWallet,
  IconInfo,
  IconExternal,
} from "@/components/shared/Icons";
import { OddsBar } from "@/components/shared/OddsBar";
import { EncryptedValue } from "@/components/shared/EncryptedValue";
import { useMarket, useHasPosition } from "@/hooks/useMarket";
import { usePlaceBet } from "@/hooks/usePlaceBet";
import { useClaimWinnings } from "@/hooks/useClaimWinnings";
import { nullCastFactoryConfig } from "@/lib/contracts";
import { useNullCastStore } from "@/lib/store";

/* ── Status helpers ──────────────────────────────────────────── */

const STATUS_LABELS: Record<number, string> = {
  0: "OPEN",
  1: "EXPIRED",
  2: "RESOLVING",
  3: "RESOLVED",
  4: "CANCELLED",
};

const STATUS_PILL_CLASS: Record<number, string> = {
  0: "pill-yes",
  1: "pill-warning",
  2: "pill-warning",
  3: "pill-privacy",
  4: "pill-no",
};

const MARKET_TYPE_LABELS: Record<number, string> = {
  0: "Binary",
  1: "Scalar",
};

function formatCUSDT(raw: bigint | undefined): string {
  if (raw === undefined) return "0";
  return (Number(raw) / 1e6).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function truncateAddress(addr: string): string {
  if (addr.length <= 10) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

/* ── Encryption helper (FHEVM SDK placeholder) ───────────────── */

/**
 * Placeholder for FHEVM client-side encryption.
 * In production, this would use @fhevm/sdk to:
 *   1. Initialize the FHEVM instance with the gateway URL
 *   2. Call instance.createEncryptedInput(contractAddress, userAddress)
 *   3. Add the uint64 amount via .add64(amountInBaseUnits)
 *   4. Encrypt and return { handle, inputProof }
 *
 * For the demo, we simulate the encryption UX flow but cannot produce
 * real encrypted inputs without the full FHEVM SDK gateway connection.
 */
async function simulateFHEEncryption(
  _amount: number // eslint-disable-line @typescript-eslint/no-unused-vars
): Promise<{ encrypted: `0x${string}`; proof: `0x${string}` } | null> {
  // Simulate encryption delay (real FHE encryption takes ~1-3s)
  await new Promise((resolve) => setTimeout(resolve, 1500));

  // In production, this would return real encrypted handles from the FHEVM SDK.
  // Returning null signals that real encryption is not available.
  return null;
}

/* ── Bet flow step type ──────────────────────────────────────── */

type BetStep = "idle" | "encrypting" | "needs-sdk" | "writing" | "confirming" | "confirmed" | "error";

/* ── Main page ────────────────────────────────────────────────── */

export default function MarketDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const { id: rawId } = params;
  const marketId = parseInt(rawId, 10);
  const isValidId = !isNaN(marketId) && marketId >= 0;

  /* ── Resolve market address from factory ────────────────────── */
  const {
    data: marketAddress,
    isLoading: isAddressLoading,
    error: addressError,
  } = useReadContract({
    ...nullCastFactoryConfig,
    functionName: "getMarket",
    args: [BigInt(isValidId ? marketId : 0)],
    query: { enabled: isValidId },
  });

  const resolvedAddress = marketAddress as `0x${string}` | undefined;
  const isZeroAddress =
    resolvedAddress === "0x0000000000000000000000000000000000000000";
  const hasAddress = !!resolvedAddress && !isZeroAddress;

  /* ── Market state (polls every 12s for live odds) ───────────── */
  const market = useMarket(
    hasAddress ? resolvedAddress : ("0x0000000000000000000000000000000000000000" as `0x${string}`),
    { refetchInterval: hasAddress ? 12_000 : undefined }
  );

  /* ── Wallet & position ──────────────────────────────────────── */
  const { address: userAddress, isConnected } = useAccount();
  const hasPosition = useHasPosition(
    hasAddress ? resolvedAddress : ("0x0000000000000000000000000000000000000000" as `0x${string}`),
    userAddress
  );

  const { data: hasClaimed } = useReadContract({
    address: hasAddress ? resolvedAddress : undefined,
    abi: [
      {
        inputs: [{ internalType: "address", name: "user", type: "address" }],
        name: "hasClaimed",
        outputs: [{ internalType: "bool", name: "", type: "bool" }],
        stateMutability: "view",
        type: "function",
      },
    ],
    functionName: "hasClaimed",
    args: userAddress ? [userAddress] : undefined,
    query: { enabled: hasAddress && !!userAddress },
  });

  /* ── Betting hooks ──────────────────────────────────────────── */
  const bet = usePlaceBet(
    hasAddress ? resolvedAddress : ("0x0000000000000000000000000000000000000000" as `0x${string}`)
  );
  const claim = useClaimWinnings(
    hasAddress ? resolvedAddress : ("0x0000000000000000000000000000000000000000" as `0x${string}`)
  );

  /* ── Zustand store ──────────────────────────────────────────── */
  const addPosition = useNullCastStore((s) => s.addPosition);
  const storedPositions = useNullCastStore((s) => s.positions);

  /* ── Local UI state ─────────────────────────────────────────── */
  const [side, setSide] = useState<"YES" | "NO">("YES");
  const [amount, setAmount] = useState("100");
  const [betStep, setBetStep] = useState<BetStep>("idle");
  const [positionRevealed, setPositionRevealed] = useState(false);

  /* ── Derived values ─────────────────────────────────────────── */
  const amountNum = parseFloat(amount) || 0;
  const yesPct = market.yesOdds;
  const noPct = market.noOdds;
  const selectedPct = side === "YES" ? yesPct : noPct;
  const multiplier = selectedPct > 0 ? (100 / selectedPct).toFixed(2) : "0.00";
  const payout = (amountNum * parseFloat(multiplier)).toFixed(2);
  const profit = (parseFloat(payout) - amountNum).toFixed(2);

  const minimumBetCUSDT = market.minimumBet
    ? Number(market.minimumBet) / 1e6
    : 0;
  const isAmountBelowMin = amountNum > 0 && amountNum < minimumBetCUSDT;
  const isMarketOpen = market.status === 0;
  const isMarketResolved = market.status === 3;
  const isMarketCancelled = market.status === 4;

  const localPosition = useMemo(
    () =>
      hasAddress
        ? storedPositions.find((p) => p.marketAddress === resolvedAddress)
        : undefined,
    [storedPositions, resolvedAddress, hasAddress]
  );

  const quickAmounts = [25, 50, 100, 250];

  /* ── Bet handler ────────────────────────────────────────────── */
  const handlePlaceBet = useCallback(async () => {
    if (!isConnected || !hasAddress || !isMarketOpen) return;
    if (amountNum <= 0 || isAmountBelowMin) return;

    setBetStep("encrypting");

    const encResult = await simulateFHEEncryption(amountNum);

    if (!encResult) {
      // Real FHE encryption not available -- show SDK notice
      setBetStep("needs-sdk");
      return;
    }

    // If real encryption were available, we would call:
    // bet.placeBet(encResult.encrypted, encResult.proof, side === "YES");
    // setBetStep("writing");
  }, [isConnected, hasAddress, isMarketOpen, amountNum, isAmountBelowMin, side]);

  // Track bet confirmation from the write hook
  const isBetConfirmed = bet.isConfirmed;
  const isBetWriting = bet.isWriting;
  const isBetConfirming = bet.isConfirming;

  // When bet is confirmed, track in Zustand
  if (isBetConfirmed && betStep === "confirming" && hasAddress && resolvedAddress) {
    addPosition({
      marketAddress: resolvedAddress,
      side,
      amount: amountNum,
      revealed: false,
      entryOdds: selectedPct,
      txHash: bet.hash,
    });
    setBetStep("confirmed");
  }

  /* ── Claim handler ──────────────────────────────────────────── */
  const handleClaim = useCallback(() => {
    if (!isConnected || !hasAddress) return;
    claim.claimWinnings();
  }, [isConnected, hasAddress, claim]);

  /* ── Loading state ──────────────────────────────────────────── */
  if (!isValidId) {
    return (
      <div
        className="container"
        style={{
          paddingTop: "80px",
          textAlign: "center",
          color: "var(--color-text-tertiary)",
        }}
      >
        <p style={{ fontSize: "var(--text-lg)", marginBottom: "12px" }}>
          Invalid market ID
        </p>
        <Link href="/markets" className="btn btn-secondary">
          <IconChevronLeft size={14} />
          Back to Markets
        </Link>
      </div>
    );
  }

  if (isAddressLoading || (hasAddress && market.isLoading)) {
    return (
      <div
        className="container"
        style={{
          paddingTop: "80px",
          textAlign: "center",
          color: "var(--color-text-tertiary)",
        }}
      >
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "12px",
            fontSize: "var(--text-md)",
          }}
        >
          <span
            className="live-dot"
            style={{ width: "8px", height: "8px" }}
          />
          Loading market data from Sepolia...
        </div>
      </div>
    );
  }

  if (addressError || !hasAddress) {
    return (
      <div
        className="container"
        style={{
          paddingTop: "80px",
          textAlign: "center",
          color: "var(--color-text-tertiary)",
        }}
      >
        <p style={{ fontSize: "var(--text-lg)", marginBottom: "12px" }}>
          Market #{marketId} not found
        </p>
        <p
          style={{
            fontSize: "var(--text-sm)",
            marginBottom: "20px",
            color: "var(--color-text-tertiary)",
          }}
        >
          This market may not exist on the factory contract.
        </p>
        <Link href="/markets" className="btn btn-secondary">
          <IconChevronLeft size={14} />
          Back to Markets
        </Link>
      </div>
    );
  }

  if (market.error) {
    return (
      <div
        className="container"
        style={{
          paddingTop: "80px",
          textAlign: "center",
          color: "var(--color-text-tertiary)",
        }}
      >
        <p style={{ fontSize: "var(--text-lg)", marginBottom: "12px" }}>
          Error loading market
        </p>
        <p
          style={{
            fontSize: "var(--text-sm)",
            marginBottom: "20px",
            fontFamily: "var(--font-mono)",
          }}
        >
          {market.error.message}
        </p>
        <Link href="/markets" className="btn btn-secondary">
          <IconChevronLeft size={14} />
          Back to Markets
        </Link>
      </div>
    );
  }

  return (
    <div
      className="container"
      style={{ paddingTop: "32px", paddingBottom: "80px" }}
    >
      <div className="detail-grid">
        {/* ── Left column ─────────────────────────────────────── */}
        <div>
          {/* Back button */}
          <Link
            href="/markets"
            className="btn btn-ghost"
            style={{ marginBottom: "20px", display: "inline-flex" }}
          >
            <IconChevronLeft size={14} />
            Back to Markets
          </Link>

          {/* Pills row */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              flexWrap: "wrap",
              marginBottom: "16px",
            }}
          >
            {/* Market type pill */}
            <span className="pill">
              {MARKET_TYPE_LABELS[market.marketType ?? 0] ?? "Binary"}
            </span>

            {/* Status badge */}
            {market.status !== undefined && (
              <span
                className={`pill ${STATUS_PILL_CLASS[market.status] ?? ""}`}
              >
                {STATUS_LABELS[market.status] ?? "UNKNOWN"}
              </span>
            )}

            <FHEBadge />

            {/* Expiry block */}
            {market.expiryBlock && (
              <span
                className="pill"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                <IconClock size={11} />
                Block {market.expiryBlock.toString()}
              </span>
            )}

            <span
              className="mono"
              style={{
                fontSize: "var(--text-xs)",
                color: "var(--color-text-tertiary)",
              }}
            >
              ID: {marketId}
            </span>
          </div>

          {/* Question */}
          <h1
            className="display"
            style={{
              fontSize: "var(--text-xl)",
              fontWeight: 700,
              letterSpacing: "-0.03em",
              marginBottom: "28px",
              lineHeight: "var(--leading-snug)",
            }}
          >
            {market.question ?? "Loading..."}
          </h1>

          {/* OddsBar card */}
          <div
            className="card card-elevated"
            style={{ marginBottom: "28px", padding: "20px 24px" }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "14px",
              }}
            >
              <span
                style={{
                  fontSize: "var(--text-sm)",
                  fontWeight: 600,
                  color: "var(--color-text-secondary)",
                }}
              >
                Current Odds
              </span>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  fontSize: "var(--text-xs)",
                  color: "var(--color-accent-bright)",
                  fontFamily: "var(--font-mono)",
                }}
              >
                <span className="live-dot" />
                Polling every 12s
              </span>
            </div>
            <OddsBar
              yes={yesPct}
              no={noPct}
              large
              pool={market.totalPool}
              lastUpdate="Live from chain"
            />
          </div>

          {/* Market details card */}
          <div className="card" style={{ marginBottom: "28px" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                marginBottom: "16px",
              }}
            >
              <IconShield size={16} stroke="var(--color-text-secondary)" />
              <span
                style={{
                  fontSize: "var(--text-sm)",
                  fontWeight: 600,
                  color: "var(--color-text-secondary)",
                }}
              >
                Market Details
              </span>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                gap: "16px",
              }}
            >
              {[
                {
                  label: "Oracle",
                  value: market.oracle
                    ? truncateAddress(market.oracle)
                    : "--",
                  mono: true,
                },
                {
                  label: "Contract",
                  value: resolvedAddress
                    ? truncateAddress(resolvedAddress)
                    : "--",
                  mono: true,
                },
                {
                  label: "Market type",
                  value:
                    MARKET_TYPE_LABELS[market.marketType ?? 0] ?? "Binary",
                },
                {
                  label: "Minimum bet",
                  value: market.minimumBet
                    ? `${formatCUSDT(market.minimumBet)} cUSDT`
                    : "--",
                },
                {
                  label: "Yes pool",
                  value: `${market.yesPool.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })} cUSDT`,
                },
                {
                  label: "No pool",
                  value: `${market.noPool.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })} cUSDT`,
                },
                {
                  label: "Expiry block",
                  value: market.expiryBlock
                    ? market.expiryBlock.toString()
                    : "--",
                  mono: true,
                },
                {
                  label: "Status",
                  value: STATUS_LABELS[market.status ?? 0] ?? "UNKNOWN",
                },
                ...(market.marketType === 1
                  ? [
                      {
                        label: "Buckets",
                        value: market.bucketCount?.toString() ?? "--",
                      },
                    ]
                  : []),
                ...(isMarketResolved
                  ? [
                      {
                        label: "Resolved outcome",
                        value:
                          market.resolvedOutcome !== undefined
                            ? market.resolvedOutcome === BigInt(1)
                              ? "YES"
                              : market.resolvedOutcome === BigInt(0)
                                ? "NO"
                                : market.resolvedOutcome.toString()
                            : "--",
                      },
                    ]
                  : []),
              ].map((item) => (
                <div key={item.label}>
                  <div
                    style={{
                      fontSize: "10px",
                      fontFamily: "var(--font-mono)",
                      color: "var(--color-text-tertiary)",
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      marginBottom: "4px",
                    }}
                  >
                    {item.label}
                  </div>
                  <div
                    className={item.mono ? "mono" : ""}
                    style={{
                      fontSize: "var(--text-sm)",
                      color: "var(--color-text-primary)",
                    }}
                  >
                    {item.value}
                  </div>
                </div>
              ))}
            </div>

            {/* Etherscan link */}
            {resolvedAddress && (
              <div style={{ marginTop: "16px" }}>
                <a
                  href={`https://sepolia.etherscan.io/address/${resolvedAddress}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-sm btn-ghost"
                  style={{
                    fontSize: "var(--text-xs)",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <IconExternal size={12} />
                  View on Etherscan
                </a>
              </div>
            )}
          </div>

          {/* Activity placeholder */}
          <div className="card" style={{ padding: "20px" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                marginBottom: "16px",
              }}
            >
              <span
                style={{
                  fontSize: "var(--text-sm)",
                  fontWeight: 600,
                  color: "var(--color-text-secondary)",
                }}
              >
                Recent Activity
              </span>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "24px 16px",
                background: "var(--color-bg-input)",
                borderRadius: "var(--radius-md)",
                color: "var(--color-text-tertiary)",
                fontSize: "var(--text-sm)",
              }}
            >
              <IconInfo size={16} stroke="var(--color-text-tertiary)" />
              <div>
                <p style={{ marginBottom: "4px" }}>
                  Activity data loads from on-chain BetPlaced events.
                </p>
                <p
                  className="mono"
                  style={{
                    fontSize: "var(--text-xs)",
                    color: "var(--color-text-tertiary)",
                  }}
                >
                  Event indexing requires a subgraph or dedicated indexer.
                  Individual bet amounts are FHE-encrypted and shown as
                  &bull;&bull;&bull;&bull;&bull;
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Right column (sticky betting panel) ─────────────── */}
        <div style={{ position: "sticky", top: "80px", alignSelf: "start" }}>
          <div className="card" style={{ padding: "24px" }}>
            {/* Header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "20px",
              }}
            >
              <span
                className="display"
                style={{ fontSize: "var(--text-md)", fontWeight: 700 }}
              >
                {isMarketResolved
                  ? "Market resolved"
                  : isMarketCancelled
                    ? "Market cancelled"
                    : "Place bet"}
              </span>
              <FHEBadge />
            </div>

            {/* ── Not connected state ─────────────────────────── */}
            {!isConnected && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "12px",
                  padding: "32px 16px",
                  textAlign: "center",
                }}
              >
                <IconWallet
                  size={32}
                  stroke="var(--color-text-tertiary)"
                />
                <p
                  style={{
                    fontSize: "var(--text-sm)",
                    color: "var(--color-text-tertiary)",
                  }}
                >
                  Connect your wallet to place bets on this market.
                </p>
              </div>
            )}

            {/* ── Resolved state: show outcome + claim ────────── */}
            {isConnected && isMarketResolved && (
              <div>
                <div
                  style={{
                    background: "var(--color-bg-input)",
                    borderRadius: "var(--radius-md)",
                    padding: "20px",
                    textAlign: "center",
                    marginBottom: "20px",
                  }}
                >
                  <div
                    style={{
                      fontSize: "var(--text-xs)",
                      fontFamily: "var(--font-mono)",
                      color: "var(--color-text-tertiary)",
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      marginBottom: "8px",
                    }}
                  >
                    Resolved Outcome
                  </div>
                  <div
                    style={{
                      fontSize: "var(--text-xl)",
                      fontWeight: 700,
                    }}
                  >
                    {market.resolvedOutcome === BigInt(1)
                      ? "YES"
                      : market.resolvedOutcome === BigInt(0)
                        ? "NO"
                        : market.resolvedOutcome?.toString() ?? "--"}
                  </div>
                </div>

                {hasPosition && !hasClaimed && (
                  <button
                    className="btn btn-lg btn-yes"
                    onClick={handleClaim}
                    disabled={claim.isWriting || claim.isConfirming}
                    type="button"
                    style={{ width: "100%", marginBottom: "12px" }}
                  >
                    {claim.isWriting
                      ? "Submitting..."
                      : claim.isConfirming
                        ? "Confirming..."
                        : claim.isConfirmed
                          ? "Claimed!"
                          : "Claim Winnings"}
                  </button>
                )}

                {hasClaimed && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      justifyContent: "center",
                      padding: "12px",
                      fontSize: "var(--text-sm)",
                      color: "var(--color-yes-text)",
                    }}
                  >
                    <IconCheck size={14} stroke="var(--color-yes-text)" />
                    Winnings already claimed
                  </div>
                )}

                {!hasPosition && (
                  <p
                    style={{
                      textAlign: "center",
                      fontSize: "var(--text-sm)",
                      color: "var(--color-text-tertiary)",
                      padding: "12px",
                    }}
                  >
                    You have no position in this market.
                  </p>
                )}

                {claim.error && (
                  <p
                    style={{
                      fontSize: "var(--text-xs)",
                      color: "var(--color-no-text)",
                      marginTop: "8px",
                      fontFamily: "var(--font-mono)",
                      wordBreak: "break-all",
                    }}
                  >
                    Error: {claim.error.message}
                  </p>
                )}
              </div>
            )}

            {/* ── Cancelled state ─────────────────────────────── */}
            {isConnected && isMarketCancelled && (
              <div
                style={{
                  textAlign: "center",
                  padding: "24px 16px",
                  color: "var(--color-text-tertiary)",
                  fontSize: "var(--text-sm)",
                }}
              >
                This market has been cancelled. No bets can be placed.
              </div>
            )}

            {/* ── Betting UI (only when OPEN and connected) ───── */}
            {isConnected && isMarketOpen && (
              <>
                {/* YES / NO side buttons */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "10px",
                    marginBottom: "20px",
                  }}
                >
                  <button
                    className={`side-btn${side === "YES" ? " side-btn--yes-active" : ""}`}
                    onClick={() => setSide("YES")}
                    type="button"
                  >
                    <div
                      style={{
                        fontSize: "var(--text-base)",
                        fontWeight: 700,
                        color:
                          side === "YES"
                            ? "var(--color-yes-text)"
                            : "var(--color-text-primary)",
                      }}
                    >
                      YES
                    </div>
                    <div
                      className="mono"
                      style={{
                        fontSize: "var(--text-xs)",
                        color: "var(--color-text-tertiary)",
                      }}
                    >
                      {yesPct}% &middot;{" "}
                      {yesPct > 0 ? (100 / yesPct).toFixed(1) : "0.0"}x
                    </div>
                  </button>
                  <button
                    className={`side-btn${side === "NO" ? " side-btn--no-active" : ""}`}
                    onClick={() => setSide("NO")}
                    type="button"
                  >
                    <div
                      style={{
                        fontSize: "var(--text-base)",
                        fontWeight: 700,
                        color:
                          side === "NO"
                            ? "var(--color-no-text)"
                            : "var(--color-text-primary)",
                      }}
                    >
                      NO
                    </div>
                    <div
                      className="mono"
                      style={{
                        fontSize: "var(--text-xs)",
                        color: "var(--color-text-tertiary)",
                      }}
                    >
                      {noPct}% &middot;{" "}
                      {noPct > 0 ? (100 / noPct).toFixed(1) : "0.0"}x
                    </div>
                  </button>
                </div>

                {/* Amount input */}
                <div style={{ marginBottom: "12px" }}>
                  <label
                    style={{
                      display: "block",
                      fontSize: "var(--text-xs)",
                      fontFamily: "var(--font-mono)",
                      color: "var(--color-text-tertiary)",
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      marginBottom: "6px",
                    }}
                  >
                    Amount
                    {minimumBetCUSDT > 0 && (
                      <span style={{ textTransform: "none", marginLeft: "8px" }}>
                        (min: {minimumBetCUSDT} cUSDT)
                      </span>
                    )}
                  </label>
                  <div style={{ position: "relative" }}>
                    <input
                      className="input input-mono"
                      type="text"
                      value={amount}
                      onChange={(e) => {
                        setAmount(e.target.value);
                        if (betStep !== "idle") setBetStep("idle");
                      }}
                      style={{
                        paddingRight: "60px",
                        ...(isAmountBelowMin
                          ? {
                              borderColor: "var(--color-no-text)",
                            }
                          : {}),
                      }}
                    />
                    <span
                      className="mono"
                      style={{
                        position: "absolute",
                        right: "14px",
                        top: "50%",
                        transform: "translateY(-50%)",
                        fontSize: "var(--text-xs)",
                        color: "var(--color-text-tertiary)",
                      }}
                    >
                      cUSDT
                    </span>
                  </div>
                  {isAmountBelowMin && (
                    <p
                      style={{
                        fontSize: "var(--text-xs)",
                        color: "var(--color-no-text)",
                        marginTop: "4px",
                      }}
                    >
                      Minimum bet is {minimumBetCUSDT} cUSDT
                    </p>
                  )}
                </div>

                {/* Quick amount chips */}
                <div
                  style={{
                    display: "flex",
                    gap: "6px",
                    marginBottom: "20px",
                  }}
                >
                  {quickAmounts.map((qa) => (
                    <button
                      key={qa}
                      className={`chip${amount === String(qa) ? " chip--active" : ""}`}
                      onClick={() => {
                        setAmount(String(qa));
                        if (betStep !== "idle") setBetStep("idle");
                      }}
                      type="button"
                      style={{
                        flex: 1,
                        textAlign: "center",
                        fontSize: "12px",
                      }}
                    >
                      {qa}
                    </button>
                  ))}
                </div>

                {/* Payout breakdown */}
                <div
                  style={{
                    background: "var(--color-bg-input)",
                    borderRadius: "var(--radius-md)",
                    padding: "16px",
                    marginBottom: "20px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: "8px",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "var(--text-sm)",
                        color: "var(--color-text-tertiary)",
                      }}
                    >
                      Stake
                    </span>
                    <span
                      className="mono"
                      style={{ fontSize: "var(--text-sm)" }}
                    >
                      {amountNum.toLocaleString()} cUSDT
                    </span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: "12px",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "var(--text-sm)",
                        color: "var(--color-text-tertiary)",
                      }}
                    >
                      Odds multiplier
                    </span>
                    <span
                      className="mono"
                      style={{ fontSize: "var(--text-sm)" }}
                    >
                      {multiplier}x
                    </span>
                  </div>
                  <div
                    style={{
                      height: "1px",
                      background: "var(--color-border-subtle)",
                      marginBottom: "12px",
                    }}
                  />
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: "6px",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "var(--text-sm)",
                        fontWeight: 600,
                        color: "var(--color-text-secondary)",
                      }}
                    >
                      Payout if correct
                    </span>
                    <span
                      className="mono"
                      style={{
                        fontSize: "var(--text-sm)",
                        fontWeight: 600,
                      }}
                    >
                      {parseFloat(payout).toLocaleString()} cUSDT
                    </span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "var(--text-sm)",
                        color: "var(--color-text-tertiary)",
                      }}
                    >
                      Profit
                    </span>
                    <span
                      className="mono"
                      style={{
                        fontSize: "var(--text-sm)",
                        color:
                          side === "YES"
                            ? "var(--color-yes-text)"
                            : "var(--color-no-text)",
                        fontWeight: 600,
                      }}
                    >
                      +{parseFloat(profit).toLocaleString()} cUSDT
                    </span>
                  </div>
                </div>

                {/* Submit button */}
                <button
                  className={`btn btn-lg ${side === "YES" ? "btn-yes" : "btn-no"}`}
                  onClick={handlePlaceBet}
                  disabled={
                    betStep !== "idle" ||
                    amountNum <= 0 ||
                    isAmountBelowMin ||
                    isBetWriting ||
                    isBetConfirming
                  }
                  type="button"
                  style={{
                    width: "100%",
                    marginBottom: "16px",
                    fontSize: "14px",
                  }}
                >
                  {betStep === "encrypting" ? (
                    <>
                      <LockIcon
                        size={14}
                        stroke="var(--color-text-tertiary)"
                      />
                      Encrypting...
                    </>
                  ) : isBetWriting ? (
                    "Submitting tx..."
                  ) : isBetConfirming ? (
                    "Confirming..."
                  ) : (
                    <>
                      <LockIcon
                        size={14}
                        stroke={
                          side === "YES"
                            ? "var(--color-yes-text)"
                            : "var(--color-no-text)"
                        }
                      />
                      Encrypt & Bet {side} &middot; {amountNum}
                    </>
                  )}
                </button>

                {/* Bet step feedback */}
                {betStep === "needs-sdk" && (
                  <div
                    style={{
                      background: "var(--color-bg-input)",
                      borderRadius: "var(--radius-md)",
                      padding: "14px",
                      marginBottom: "16px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        fontSize: "var(--text-sm)",
                        fontWeight: 600,
                        color: "var(--color-text-secondary)",
                        marginBottom: "6px",
                      }}
                    >
                      <IconInfo
                        size={14}
                        stroke="var(--color-text-secondary)"
                      />
                      FHEVM SDK Required
                    </div>
                    <p
                      style={{
                        fontSize: "var(--text-xs)",
                        color: "var(--color-text-tertiary)",
                        lineHeight: "var(--leading-normal)",
                        marginBottom: "8px",
                      }}
                    >
                      Real bet placement requires the FHEVM SDK to encrypt
                      your bet amount client-side before submission. The SDK
                      connects to the Zama gateway to produce encrypted
                      inputs (externalEuint64 + inputProof).
                    </p>
                    <button
                      className="btn btn-sm btn-secondary"
                      onClick={() => setBetStep("idle")}
                      type="button"
                    >
                      Dismiss
                    </button>
                  </div>
                )}

                {betStep === "confirmed" && (
                  <div
                    style={{
                      background: "var(--color-yes-muted)",
                      borderRadius: "var(--radius-md)",
                      padding: "12px 14px",
                      marginBottom: "16px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        fontSize: "var(--text-sm)",
                        color: "var(--color-yes-text)",
                        fontWeight: 600,
                        marginBottom: "4px",
                      }}
                    >
                      <IconCheck
                        size={14}
                        stroke="var(--color-yes-text)"
                      />
                      Bet placed successfully
                    </div>
                    <p
                      style={{
                        fontSize: "var(--text-xs)",
                        color: "var(--color-text-tertiary)",
                        lineHeight: "var(--leading-normal)",
                      }}
                    >
                      Your {side} position of {amountNum} cUSDT has been
                      encrypted and recorded on-chain.
                    </p>
                  </div>
                )}

                {bet.error && (
                  <div
                    style={{
                      background: "var(--color-no-muted)",
                      borderRadius: "var(--radius-md)",
                      padding: "12px 14px",
                      marginBottom: "16px",
                    }}
                  >
                    <p
                      style={{
                        fontSize: "var(--text-xs)",
                        color: "var(--color-no-text)",
                        fontFamily: "var(--font-mono)",
                        wordBreak: "break-all",
                      }}
                    >
                      Error: {bet.error.message}
                    </p>
                  </div>
                )}

                {/* Privacy notice */}
                <div
                  style={{
                    background: "var(--color-privacy-muted)",
                    borderRadius: "var(--radius-md)",
                    padding: "12px 14px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "8px",
                    }}
                  >
                    <LockIcon
                      size={13}
                      stroke="var(--color-privacy-text)"
                      style={{ marginTop: "2px", flexShrink: 0 }}
                    />
                    <p
                      style={{
                        fontSize: "var(--text-xs)",
                        color: "var(--color-privacy-text)",
                        lineHeight: "var(--leading-normal)",
                      }}
                    >
                      Your amount is encrypted client-side using FHE before
                      submission. No one -- not even the contract owner -- can
                      see individual bet amounts. Only aggregate pool totals
                      are publicly decryptable.
                    </p>
                  </div>
                </div>

                {/* Position section */}
                {(hasPosition || localPosition) && (
                  <div
                    style={{
                      marginTop: "20px",
                      borderTop: "1px solid var(--color-border-subtle)",
                      paddingTop: "20px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: "14px",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "var(--text-sm)",
                          fontWeight: 600,
                          color: "var(--color-text-secondary)",
                        }}
                      >
                        Your position
                      </span>
                      {localPosition && (
                        <span
                          className={`pill ${localPosition.side === "YES" ? "pill-yes" : "pill-no"}`}
                        >
                          {localPosition.side}
                        </span>
                      )}
                    </div>
                    {localPosition && (
                      <>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            marginBottom: "8px",
                          }}
                        >
                          <span
                            style={{
                              fontSize: "var(--text-xs)",
                              color: "var(--color-text-tertiary)",
                            }}
                          >
                            Entry odds
                          </span>
                          <span
                            className="mono"
                            style={{ fontSize: "var(--text-sm)" }}
                          >
                            {localPosition.entryOdds}%
                          </span>
                        </div>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                          }}
                        >
                          <span
                            style={{
                              fontSize: "var(--text-xs)",
                              color: "var(--color-text-tertiary)",
                            }}
                          >
                            Amount
                          </span>
                          <EncryptedValue
                            value={localPosition.amount}
                            revealed={localPosition.revealed || positionRevealed}
                            onReveal={() => setPositionRevealed(true)}
                            size="sm"
                          />
                        </div>
                      </>
                    )}
                    {!localPosition && hasPosition && (
                      <p
                        style={{
                          fontSize: "var(--text-xs)",
                          color: "var(--color-text-tertiary)",
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                        }}
                      >
                        <LockIcon size={12} />
                        You have an encrypted position in this market.
                      </p>
                    )}
                  </div>
                )}
              </>
            )}

            {/* Non-open, non-resolved, non-cancelled states (EXPIRED / RESOLVING) */}
            {isConnected &&
              !isMarketOpen &&
              !isMarketResolved &&
              !isMarketCancelled && (
                <div
                  style={{
                    textAlign: "center",
                    padding: "24px 16px",
                    color: "var(--color-text-tertiary)",
                    fontSize: "var(--text-sm)",
                  }}
                >
                  <p style={{ marginBottom: "8px" }}>
                    This market is{" "}
                    <strong>
                      {STATUS_LABELS[market.status ?? 0]?.toLowerCase()}
                    </strong>
                    .
                  </p>
                  <p>Betting is no longer available.</p>
                </div>
              )}
          </div>
        </div>
      </div>
    </div>
  );
}
