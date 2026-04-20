"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import {
  useAccount,
  useReadContract,
  useBlockNumber,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { Icon, CheckIcon } from "@/components/shared/Icons";
import { OddsBar } from "@/components/shared/OddsBar";
import { GlowCard } from "@/components/shared/GlowCard";
import { CipherReveal } from "@/components/shared/CipherReveal";
import { PulseDot } from "@/components/shared/PulseDot";
import { useMarket, useHasPosition } from "@/hooks/useMarket";
import { usePlaceBet } from "@/hooks/usePlaceBet";
import { useClaimWinnings } from "@/hooks/useClaimWinnings";
import { useApproveCUSDT } from "@/hooks/useCUSDT";
import { useFHEEncrypt } from "@/hooks/useFHEVM";
import { useOddsKeeper } from "@/hooks/useOddsKeeper";
import { useUserDecrypt } from "@/hooks/useUserDecrypt";
import { nullCastFactoryConfig, getMarketConfig } from "@/lib/contracts";
import { CONTRACT_ADDRESSES } from "@/constants/addresses";
import { useNullCastStore } from "@/lib/store";

/* ── Helpers ───────────────────────────────────────────────────── */

const STATUS_LABELS: Record<number, string> = {
  0: "OPEN",
  1: "EXPIRED",
  2: "RESOLVING",
  3: "RESOLVED",
  4: "CANCELLED",
};

const MARKET_TYPE_LABELS: Record<number, string> = {
  0: "Binary",
  1: "Scalar",
};

function fmtCUSDT(raw: bigint | undefined): string {
  if (raw === undefined) return "0.00";
  return (Number(raw) / 1e6).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function truncAddr(addr: string): string {
  if (addr.length <= 10) return addr;
  return `${addr.slice(0, 6)}\u2026${addr.slice(-4)}`;
}

function formatPool(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/* ── MetaCell ──────────────────────────────────────────────────── */

function MetaCell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div
        style={{
          fontSize: 9,
          color: "var(--ink-4)",
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          marginBottom: 5,
        }}
      >
        {label}
      </div>
      <div className="mono" style={{ color: "var(--ink-2)", fontSize: 11 }}>
        {value}
      </div>
    </div>
  );
}

/* ── SideButton ────────────────────────────────────────────────── */

function SideButton({
  active,
  side,
  pct,
  onClick,
  dim,
}: {
  active: boolean;
  side: "YES" | "NO";
  pct: number;
  onClick: () => void;
  dim: boolean;
}) {
  const isYes = side === "YES";
  const color = isYes ? "var(--yes)" : "var(--no)";
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        position: "relative",
        padding: "16px 0",
        border: `1px solid ${active ? color : "var(--line-2)"}`,
        borderLeft: active
          ? `3px solid ${color}`
          : "1px solid var(--line-2)",
        borderRadius: 4,
        background: active
          ? isYes
            ? "rgba(107,155,122,0.08)"
            : "rgba(184,107,107,0.08)"
          : "var(--bg-0)",
        opacity: dim ? 0.4 : 1,
        transition: "all 220ms cubic-bezier(0.22, 1, 0.36, 1)",
        transform: active ? "scale(1.0)" : "scale(0.98)",
        textAlign: "center",
        cursor: "pointer",
      }}
    >
      <div
        className="mono"
        style={{
          fontSize: 11,
          color,
          letterSpacing: "0.18em",
          fontWeight: 500,
        }}
      >
        {side}
      </div>
      <div
        className="mono"
        style={{
          fontSize: 20,
          color: "var(--ink-1)",
          marginTop: 6,
          letterSpacing: "-0.01em",
        }}
      >
        {pct.toFixed(1)}%
      </div>
    </button>
  );
}

/* ── Bet flow step type ────────────────────────────────────────── */

type BetStep =
  | "idle"
  | "encrypting"
  | "approving"
  | "writing"
  | "confirming"
  | "confirmed"
  | "error";

/* ── Page ──────────────────────────────────────────────────────── */

export default function MarketDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const { id: rawId } = params;
  const marketId = parseInt(rawId, 10);
  const isValidId = !isNaN(marketId) && marketId >= 0;

  /* ── Resolve market address from factory ─────────────────────── */
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

  /* ── Market state (polls every 12s) ──────────────────────────── */
  const market = useMarket(
    hasAddress
      ? resolvedAddress
      : ("0x0000000000000000000000000000000000000000" as `0x${string}`),
    { refetchInterval: hasAddress ? 12_000 : undefined }
  );

  /* ── Wallet & position ───────────────────────────────────────── */
  const { address: userAddress, isConnected } = useAccount();
  const hasPosition = useHasPosition(
    hasAddress
      ? resolvedAddress
      : ("0x0000000000000000000000000000000000000000" as `0x${string}`),
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

  /* ── Betting hooks ───────────────────────────────────────────── */
  const zeroAddr =
    "0x0000000000000000000000000000000000000000" as `0x${string}`;
  const bet = usePlaceBet(hasAddress ? resolvedAddress : zeroAddr);
  const claim = useClaimWinnings(hasAddress ? resolvedAddress : zeroAddr);
  const approveCUSDT = useApproveCUSDT();
  const fhe = useFHEEncrypt();
  const oddsKeeper = useOddsKeeper(hasAddress ? resolvedAddress : zeroAddr);
  const userDecrypt = useUserDecrypt(hasAddress ? resolvedAddress : zeroAddr);

  /* ── Current block for dispute window countdown ──────────────── */
  const { data: currentBlock } = useBlockNumber({
    watch: market.status === 3,
  });

  /* ── Dispute hooks ──────────────────────────────────────────── */
  const marketConfig = hasAddress ? getMarketConfig(resolvedAddress) : null;
  const {
    writeContract: writeDispute,
    data: disputeHash,
    isPending: isDisputeWriting,
    error: disputeWriteError,
  } = useWriteContract();
  const {
    isLoading: isDisputeConfirming,
    isSuccess: isDisputeConfirmed,
    error: disputeConfirmError,
  } = useWaitForTransactionReceipt({ hash: disputeHash });

  const handleRaiseDispute = useCallback(() => {
    if (!marketConfig) return;
    writeDispute({
      ...marketConfig,
      functionName: "raiseDispute",
    });
  }, [marketConfig, writeDispute]);

  /* ── Zustand store ───────────────────────────────────────────── */
  const addPosition = useNullCastStore((s) => s.addPosition);
  const invalidateDecrypt = useNullCastStore(
    (s) => s.invalidateDecryptedValues
  );
  const storedPositions = useNullCastStore((s) => s.positions);

  /* ── Local UI state ──────────────────────────────────────────── */
  const [side, setSide] = useState<"YES" | "NO">("YES");
  const [amount, setAmount] = useState("100");
  const [betStep, setBetStep] = useState<BetStep>("idle");
  const [positionReveal, setPositionReveal] = useState(false);

  /* ── Derived values ──────────────────────────────────────────── */
  const amountNum = parseFloat(amount) || 0;
  const yesPct = market.yesOdds;
  const noPct = market.noOdds;
  const selectedPct = side === "YES" ? yesPct : noPct;
  const multiplier =
    selectedPct > 0 ? (100 / selectedPct).toFixed(2) : "0.00";
  const payout = amountNum * parseFloat(multiplier);
  const profit = payout - amountNum;

  const minimumBetCUSDT = market.minimumBet
    ? Number(market.minimumBet) / 1e6
    : 0;
  const isAmountBelowMin = amountNum > 0 && amountNum < minimumBetCUSDT;
  const isMarketOpen = market.status === 0;
  const isMarketResolved = market.status === 3;
  const isMarketCancelled = market.status === 4;

  const localPositions = useMemo(
    () =>
      hasAddress
        ? storedPositions.filter((p) => p.marketAddress === resolvedAddress)
        : [],
    [storedPositions, resolvedAddress, hasAddress]
  );

  const quickAmounts = [25, 50, 100, 250, 500];

  /* ── Bet handler ─────────────────────────────────────────────── */
  const handlePlaceBet = useCallback(async () => {
    if (!isConnected || !hasAddress || !resolvedAddress || !isMarketOpen)
      return;
    if (amountNum <= 0 || isAmountBelowMin) return;

    try {
      setBetStep("encrypting");
      const amountBaseUnits = BigInt(Math.round(amountNum * 1e6));

      const encResult = await fhe.encrypt(amountBaseUnits, resolvedAddress);
      if (!encResult) {
        setBetStep("error");
        return;
      }

      setBetStep("approving");
      const approveEnc = await fhe.encrypt(
        amountBaseUnits,
        CONTRACT_ADDRESSES.MockcUSDT as `0x${string}`
      );
      if (!approveEnc) {
        setBetStep("error");
        return;
      }
      approveCUSDT.approve(
        resolvedAddress,
        approveEnc.handle,
        approveEnc.inputProof
      );

      setBetStep("writing");
      bet.placeBet(encResult.handle, encResult.inputProof, side === "YES");
      setBetStep("confirming");
    } catch {
      setBetStep("error");
    }
  }, [
    isConnected,
    hasAddress,
    resolvedAddress,
    isMarketOpen,
    amountNum,
    isAmountBelowMin,
    side,
    fhe,
    approveCUSDT,
    bet,
  ]);

  const isBetConfirmed = bet.isConfirmed;
  const isBetWriting = bet.isWriting;
  const isBetConfirming = bet.isConfirming;

  const prevBetConfirmed = useRef(false);
  useEffect(() => {
    if (
      isBetConfirmed &&
      !prevBetConfirmed.current &&
      betStep === "confirming" &&
      hasAddress &&
      resolvedAddress
    ) {
      prevBetConfirmed.current = true;
      addPosition({
        marketAddress: resolvedAddress,
        side,
        amount: amountNum,
        revealed: false,
        entryOdds: selectedPct,
        txHash: bet.hash,
      });
      setBetStep("confirmed");
      invalidateDecrypt(resolvedAddress);
      oddsKeeper.updateOdds();
      setTimeout(() => market.refetch(), 15_000);
    }
    if (!isBetConfirmed) {
      prevBetConfirmed.current = false;
    }
  }, [
    isBetConfirmed,
    betStep,
    hasAddress,
    resolvedAddress,
    side,
    amountNum,
    selectedPct,
    bet.hash,
    addPosition,
    invalidateDecrypt,
    oddsKeeper,
    market,
  ]);

  /* ── Claim handler ───────────────────────────────────────────── */
  const handleClaim = useCallback(() => {
    if (!isConnected || !hasAddress) return;
    claim.claimWinnings();
  }, [isConnected, hasAddress, claim]);

  /* ── Placeholder activity rows ───────────────────────────────── */
  const placeholderActivity = [
    { side: "YES", addr: "0x1a2b\u20269c0d", block: "--", mine: false },
    { side: "NO", addr: "0x3e4f\u2026a1b2", block: "--", mine: false },
    { side: "YES", addr: "0x5c6d\u2026e3f4", block: "--", mine: false },
    { side: "YES", addr: "0x7a8b\u202612cd", block: "--", mine: false },
    { side: "NO", addr: "0x9e0f\u202634ab", block: "--", mine: false },
  ];

  /* ── Resolved outcome label ──────────────────────────────────── */
  const resolvedLabel =
    market.resolvedOutcome === BigInt(1)
      ? "YES"
      : market.resolvedOutcome === BigInt(0)
        ? "NO"
        : market.resolvedOutcome?.toString() ?? "--";

  /* ── Position display value for CipherReveal ─────────────────── */
  const positionValueStr = useMemo(() => {
    if (!userDecrypt.isDecrypted) return "0.00";
    const yesVal = userDecrypt.yesAmount
      ? Number(userDecrypt.yesAmount) / 1e6
      : 0;
    const noVal = userDecrypt.noAmount
      ? Number(userDecrypt.noAmount) / 1e6
      : 0;
    const total = yesVal + noVal;
    return total.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }, [userDecrypt.isDecrypted, userDecrypt.yesAmount, userDecrypt.noAmount]);

  const positionSide = useMemo(() => {
    if (!userDecrypt.isDecrypted) return "YES";
    const yesVal = userDecrypt.yesAmount
      ? Number(userDecrypt.yesAmount)
      : 0;
    const noVal = userDecrypt.noAmount ? Number(userDecrypt.noAmount) : 0;
    return yesVal >= noVal ? "YES" : "NO";
  }, [userDecrypt.isDecrypted, userDecrypt.yesAmount, userDecrypt.noAmount]);

  /* ── Error / loading states ──────────────────────────────────── */
  if (!isValidId) {
    return (
      <div
        className="page-in"
        style={{
          maxWidth: 1280,
          margin: "0 auto",
          padding: "80px 48px",
          textAlign: "center",
        }}
      >
        <p style={{ color: "var(--ink-2)", marginBottom: 12 }}>
          Invalid market ID
        </p>
        <Link
          href="/markets"
          style={{
            fontSize: 13,
            color: "var(--gold)",
            textDecoration: "none",
          }}
        >
          &larr; Back to Markets
        </Link>
      </div>
    );
  }

  if (isAddressLoading || (hasAddress && market.isLoading)) {
    return (
      <div
        className="page-in"
        style={{
          maxWidth: 1280,
          margin: "0 auto",
          padding: "80px 48px",
          textAlign: "center",
        }}
      >
        <span
          className="mono"
          style={{ color: "var(--ink-3)", fontSize: 12 }}
        >
          Loading market data from Sepolia...
        </span>
      </div>
    );
  }

  if (addressError || !hasAddress) {
    return (
      <div
        className="page-in"
        style={{
          maxWidth: 1280,
          margin: "0 auto",
          padding: "80px 48px",
          textAlign: "center",
        }}
      >
        <p style={{ color: "var(--ink-2)", marginBottom: 8 }}>
          Market #{marketId} not found
        </p>
        <p
          className="mono"
          style={{
            color: "var(--ink-4)",
            marginBottom: 20,
            fontSize: 12,
          }}
        >
          This market may not exist on the factory contract.
        </p>
        <Link
          href="/markets"
          style={{
            fontSize: 13,
            color: "var(--gold)",
            textDecoration: "none",
          }}
        >
          &larr; Back to Markets
        </Link>
      </div>
    );
  }

  if (market.error) {
    return (
      <div
        className="page-in"
        style={{
          maxWidth: 1280,
          margin: "0 auto",
          padding: "80px 48px",
          textAlign: "center",
        }}
      >
        <p style={{ color: "var(--ink-2)", marginBottom: 8 }}>
          Error loading market
        </p>
        <p
          className="mono"
          style={{ color: "var(--ink-4)", fontSize: 12 }}
        >
          {market.error.message}
        </p>
        <Link
          href="/markets"
          style={{
            fontSize: 13,
            color: "var(--gold)",
            marginTop: 20,
            display: "inline-block",
            textDecoration: "none",
          }}
        >
          &larr; Back to Markets
        </Link>
      </div>
    );
  }

  /* ── Render ──────────────────────────────────────────────────── */
  return (
    <div
      className="page-in"
      style={{
        maxWidth: 1280,
        margin: "0 auto",
        padding: "32px 48px 80px",
      }}
    >
      {/* Breadcrumb */}
      <div style={{ marginBottom: 24 }}>
        <Link
          href="/markets"
          className="mono"
          style={{
            fontSize: 11,
            color: "var(--ink-3)",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            textDecoration: "none",
          }}
        >
          &larr; Markets
        </Link>
        <span
          className="mono"
          style={{
            fontSize: 11,
            color: "var(--ink-4)",
            margin: "0 10px",
          }}
        >
          /
        </span>
        <span
          className="mono"
          style={{
            fontSize: 11,
            color: "var(--ink-3)",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          {market.category || MARKET_TYPE_LABELS[market.marketType ?? 0] || "Binary"}
        </span>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 380px",
          gap: 48,
          alignItems: "flex-start",
        }}
      >
        {/* ================================================================
            LEFT COLUMN
            ================================================================ */}
        <div>
          {/* Question */}
          <h1
            className="serif"
            style={{
              fontSize: 42,
              fontWeight: 500,
              letterSpacing: "-0.02em",
              lineHeight: 1.15,
              color: "var(--ink-1)",
              textWrap: "balance",
              margin: 0,
            }}
          >
            {market.question ?? "Loading..."}
          </h1>

          {/* Big odds bar */}
          <div style={{ marginTop: 40 }}>
            <OddsBar
              yes={yesPct}
              no={noPct}
              size="lg"
              showLabels={false}
            />
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginTop: 14,
              }}
            >
              <div>
                <div
                  className="mono"
                  style={{
                    fontSize: 30,
                    color: "var(--yes)",
                    fontWeight: 500,
                    letterSpacing: "-0.02em",
                  }}
                >
                  {yesPct.toFixed(1)}%
                </div>
                <div
                  className="mono"
                  style={{
                    fontSize: 10,
                    color: "var(--ink-3)",
                    letterSpacing: "0.16em",
                    textTransform: "uppercase",
                    marginTop: 4,
                  }}
                >
                  YES
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div
                  className="mono"
                  style={{
                    fontSize: 30,
                    color: "var(--no)",
                    fontWeight: 500,
                    letterSpacing: "-0.02em",
                  }}
                >
                  {noPct.toFixed(1)}%
                </div>
                <div
                  className="mono"
                  style={{
                    fontSize: 10,
                    color: "var(--ink-3)",
                    letterSpacing: "0.16em",
                    textTransform: "uppercase",
                    marginTop: 4,
                  }}
                >
                  NO
                </div>
              </div>
            </div>
          </div>

          {/* Pool row */}
          <div
            className="mono"
            style={{
              marginTop: 32,
              paddingTop: 20,
              paddingBottom: 20,
              borderTop: "1px solid var(--line)",
              borderBottom: "1px solid var(--line)",
              display: "flex",
              gap: 32,
              fontSize: 13,
              color: "var(--ink-2)",
              alignItems: "center",
            }}
          >
            <span
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <PulseDot color="var(--gold)" />
              <span style={{ color: "var(--ink-1)" }}>
                {formatPool(market.totalPool)}
              </span>
              <span style={{ color: "var(--ink-3)", fontSize: 11 }}>
                pool
              </span>
            </span>
            <span style={{ color: "var(--ink-4)" }}>&middot;</span>
            <span>
              <span style={{ color: "var(--ink-1)" }}>
                {market.expiryBlock
                  ? market.expiryBlock.toString()
                  : "--"}
              </span>
              <span
                style={{
                  color: "var(--ink-3)",
                  fontSize: 11,
                  marginLeft: 6,
                }}
              >
                expiry
              </span>
            </span>
          </div>

          {/* Your position (compact) */}
          {(hasPosition || localPositions.length > 0) && (
            <div
              style={{
                marginTop: 24,
                padding: "14px 18px",
                border: "1px solid var(--line)",
                borderRadius: 4,
                display: "flex",
                alignItems: "center",
                gap: 24,
              }}
            >
              <span
                className="mono"
                style={{
                  fontSize: 10,
                  color: "var(--ink-3)",
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                }}
              >
                Your position
              </span>
              {userDecrypt.isDecrypted ? (
                <>
                  <span
                    className="mono"
                    style={{
                      fontSize: 13,
                      color:
                        positionSide === "YES"
                          ? "var(--yes)"
                          : "var(--no)",
                      fontWeight: 500,
                    }}
                  >
                    {positionSide}
                  </span>
                  <span
                    className="mono"
                    style={{
                      fontSize: 14,
                      color: "var(--ink-1)",
                      minWidth: 120,
                    }}
                  >
                    <CipherReveal
                      value={positionValueStr}
                      reveal={positionReveal}
                      width={8}
                    />
                    <span
                      style={{
                        color: "var(--ink-3)",
                        marginLeft: 6,
                        fontSize: 11,
                      }}
                    >
                      cUSDT
                    </span>
                  </span>
                </>
              ) : (
                <span
                  className="mono"
                  style={{
                    fontSize: 14,
                    color: "var(--ink-3)",
                    minWidth: 120,
                  }}
                >
                  {"\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022"}
                  <span
                    style={{
                      color: "var(--ink-3)",
                      marginLeft: 6,
                      fontSize: 11,
                    }}
                  >
                    cUSDT
                  </span>
                </span>
              )}
              <div style={{ flex: 1 }} />
              {userDecrypt.isDecrypted ? (
                <button
                  type="button"
                  onClick={() => setPositionReveal(true)}
                  disabled={positionReveal}
                  style={{
                    fontSize: 12,
                    color: positionReveal
                      ? "var(--ink-3)"
                      : "var(--gold)",
                    padding: "6px 12px",
                    border: `1px solid ${positionReveal ? "var(--line)" : "var(--gold-dim)"}`,
                    borderRadius: 3,
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    cursor: positionReveal ? "default" : "pointer",
                    background: "none",
                  }}
                >
                  <Icon name="eye" size={12} />
                  {positionReveal ? "Revealed" : "Reveal"}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={userDecrypt.decrypt}
                  disabled={userDecrypt.isDecrypting}
                  style={{
                    fontSize: 12,
                    color: "var(--gold)",
                    padding: "6px 12px",
                    border: "1px solid var(--gold-dim)",
                    borderRadius: 3,
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    cursor: "pointer",
                    background: "none",
                  }}
                >
                  <Icon name="eye" size={12} />
                  {userDecrypt.isDecrypting ? "Decrypting..." : "Reveal"}
                </button>
              )}
            </div>
          )}

          {/* Metadata grid */}
          <div
            className="mono"
            style={{
              marginTop: 36,
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 20,
              fontSize: 11,
              color: "var(--ink-3)",
            }}
          >
            <MetaCell
              label="Oracle"
              value={
                market.oracle ? truncAddr(market.oracle) : "--"
              }
            />
            <MetaCell
              label="Contract"
              value={
                resolvedAddress ? truncAddr(resolvedAddress) : "--"
              }
            />
            <MetaCell label="Fee" value="0%" />
            <MetaCell
              label="Min bet"
              value={
                market.minimumBet
                  ? `${fmtCUSDT(market.minimumBet)} cUSDT`
                  : "--"
              }
            />
          </div>

          {/* Activity feed */}
          <div style={{ marginTop: 48 }}>
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                justifyContent: "space-between",
                marginBottom: 14,
              }}
            >
              <h2
                className="serif"
                style={{
                  fontSize: 20,
                  fontWeight: 500,
                  letterSpacing: "-0.01em",
                  margin: 0,
                }}
              >
                Recent activity
              </h2>
              <span
                className="mono"
                style={{
                  fontSize: 10,
                  color: "var(--ink-3)",
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <PulseDot color="var(--yes)" /> live
              </span>
            </div>
            <div
              style={{
                border: "1px solid var(--line)",
                borderRadius: 4,
                background: "var(--bg-1)",
                overflow: "hidden",
              }}
            >
              {placeholderActivity.map((row, i) => (
                <div
                  key={i}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "12px 140px 1fr 120px",
                    alignItems: "center",
                    padding: "10px 18px",
                    gap: 16,
                    borderTop:
                      i === 0 ? "none" : "1px solid var(--line)",
                    background: row.mine
                      ? "var(--bg-2)"
                      : "transparent",
                    opacity: 1 - i * 0.04,
                    transition: "opacity 300ms",
                  }}
                >
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background:
                        row.side === "YES"
                          ? "var(--yes)"
                          : "var(--no)",
                      display: "inline-block",
                    }}
                  />
                  <span
                    className="mono"
                    style={{
                      fontSize: 12,
                      color: "var(--ink-2)",
                    }}
                  >
                    {row.addr}
                    {row.mine && (
                      <span
                        style={{
                          color: "var(--gold)",
                          fontSize: 10,
                          marginLeft: 4,
                        }}
                      >
                        you
                      </span>
                    )}
                  </span>
                  <span
                    className="mono"
                    style={{
                      fontSize: 11,
                      color: "var(--ink-3)",
                      letterSpacing: "0.06em",
                    }}
                  >
                    encrypted
                  </span>
                  <span
                    className="mono"
                    style={{
                      fontSize: 11,
                      color: "var(--ink-3)",
                      textAlign: "right",
                    }}
                  >
                    block {row.block}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ================================================================
            RIGHT COLUMN -- Trading panel
            ================================================================ */}
        <aside style={{ position: "sticky", top: 72 }}>
          {/* ── Resolved outcome card ────────────────────────────── */}
          {isMarketResolved && (
            <GlowCard style={{ padding: 24, marginBottom: 16 }}>
              <div
                className="mono"
                style={{
                  fontSize: 10,
                  color: "var(--ink-3)",
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                  marginBottom: 12,
                }}
              >
                Resolved
              </div>
              <div
                style={{ textAlign: "center", padding: "12px 0" }}
              >
                <div
                  className="serif"
                  style={{
                    fontSize: 32,
                    fontWeight: 500,
                    color:
                      resolvedLabel === "YES"
                        ? "var(--yes)"
                        : resolvedLabel === "NO"
                          ? "var(--no)"
                          : "var(--ink-1)",
                  }}
                >
                  {resolvedLabel}
                </div>

                {isConnected && hasPosition && !hasClaimed && (
                  <button
                    type="button"
                    onClick={handleClaim}
                    disabled={
                      claim.isWriting || claim.isConfirming
                    }
                    style={{
                      width: "100%",
                      marginTop: 20,
                      padding: "14px 0",
                      fontSize: 13,
                      fontWeight: 500,
                      borderRadius: 4,
                      color: "#0C1510",
                      background: "var(--yes)",
                      border: "none",
                      cursor:
                        claim.isWriting || claim.isConfirming
                          ? "not-allowed"
                          : "pointer",
                    }}
                  >
                    {claim.isWriting
                      ? "Submitting..."
                      : claim.isConfirming
                        ? "Confirming..."
                        : claim.isConfirmed
                          ? "Claimed"
                          : "Claim Winnings"}
                  </button>
                )}

                {isConnected && hasClaimed && (
                  <div
                    style={{
                      marginTop: 16,
                      display: "flex",
                      justifyContent: "center",
                      gap: 6,
                      color: "var(--yes)",
                      fontSize: 13,
                    }}
                  >
                    <CheckIcon size={12} /> Winnings claimed
                  </div>
                )}

                {isConnected && !hasPosition && (
                  <p
                    style={{
                      marginTop: 16,
                      fontSize: 12,
                      color: "var(--ink-4)",
                    }}
                  >
                    No position in this market.
                  </p>
                )}

                {claim.error && (
                  <p
                    className="mono"
                    style={{
                      marginTop: 12,
                      fontSize: 11,
                      color: "var(--no)",
                      wordBreak: "break-all",
                    }}
                  >
                    {claim.error.message}
                  </p>
                )}
              </div>
            </GlowCard>
          )}

          {/* ── Dispute window card ──────────────────────────────── */}
          {isMarketResolved &&
            (() => {
              const resolvedAt = market.resolvedAtBlock;
              const window = market.disputeWindow;
              const isDisputed =
                market.disputed || isDisputeConfirmed;

              if (!resolvedAt || !window) return null;

              const deadline = resolvedAt + window;
              const blocksRemaining = currentBlock
                ? Number(deadline) - Number(currentBlock)
                : null;
              const windowOpen =
                blocksRemaining !== null && blocksRemaining > 0;

              return (
                <div
                  style={{
                    border: "1px solid var(--line)",
                    borderRadius: 4,
                    padding: 20,
                    marginBottom: 16,
                  }}
                >
                  <div
                    className="mono"
                    style={{
                      fontSize: 10,
                      color: "var(--ink-3)",
                      letterSpacing: "0.16em",
                      textTransform: "uppercase",
                      marginBottom: 14,
                    }}
                  >
                    Dispute window
                  </div>
                  {isDisputed ? (
                    <div style={{ textAlign: "center", padding: "8px 0" }}>
                      <p
                        style={{
                          fontSize: 13,
                          color: "var(--no)",
                          fontWeight: 500,
                          marginBottom: 4,
                        }}
                      >
                        This market has been disputed
                      </p>
                      <p
                        style={{
                          fontSize: 12,
                          color: "var(--ink-3)",
                          margin: 0,
                        }}
                      >
                        Resolution is under review by the oracle.
                      </p>
                    </div>
                  ) : windowOpen ? (
                    <div>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          marginBottom: 12,
                          fontSize: 13,
                        }}
                      >
                        <span style={{ color: "var(--ink-3)" }}>
                          Blocks remaining
                        </span>
                        <span
                          className="mono"
                          style={{
                            color: "var(--ink-1)",
                            fontWeight: 600,
                          }}
                        >
                          {blocksRemaining!.toLocaleString()}
                        </span>
                      </div>
                      <div
                        style={{
                          width: "100%",
                          height: 4,
                          background: "var(--line)",
                          borderRadius: 2,
                          marginBottom: 14,
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            width: `${Math.max(0, Math.min(100, ((Number(window) - blocksRemaining!) / Number(window)) * 100))}%`,
                            height: "100%",
                            background: "var(--gold)",
                            borderRadius: 2,
                            transition: "width 0.3s ease",
                          }}
                        />
                      </div>
                      {isConnected && (
                        <button
                          type="button"
                          onClick={handleRaiseDispute}
                          disabled={
                            isDisputeWriting ||
                            isDisputeConfirming
                          }
                          style={{
                            width: "100%",
                            padding: "10px 0",
                            fontSize: 12,
                            border: "1px solid var(--line-2)",
                            borderRadius: 4,
                            color: "var(--ink-1)",
                            background: "transparent",
                            cursor:
                              isDisputeWriting ||
                              isDisputeConfirming
                                ? "not-allowed"
                                : "pointer",
                          }}
                        >
                          {isDisputeWriting
                            ? "Confirm in wallet..."
                            : isDisputeConfirming
                              ? "Confirming..."
                              : "Raise Dispute"}
                        </button>
                      )}
                      {(disputeWriteError ||
                        disputeConfirmError) && (
                        <p
                          className="mono"
                          style={{
                            fontSize: 11,
                            color: "var(--no)",
                            marginTop: 8,
                            wordBreak: "break-all",
                          }}
                        >
                          {(
                            disputeWriteError ||
                            disputeConfirmError
                          )?.message}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div
                      style={{
                        textAlign: "center",
                        padding: "8px 0",
                      }}
                    >
                      <p
                        style={{
                          fontSize: 13,
                          color: "var(--ink-3)",
                          margin: 0,
                        }}
                      >
                        Dispute window closed
                      </p>
                    </div>
                  )}
                </div>
              );
            })()}

          {/* ── Betting panel ─────────────────────────────────────── */}
          {!isMarketResolved && (
            <GlowCard style={{ padding: 24 }}>
              {/* Not connected */}
              {!isConnected && (
                <p
                  style={{
                    textAlign: "center",
                    padding: "32px 0",
                    color: "var(--ink-4)",
                    fontSize: 13,
                  }}
                >
                  Connect wallet to place bets.
                </p>
              )}

              {/* Cancelled */}
              {isConnected && isMarketCancelled && (
                <p
                  style={{
                    textAlign: "center",
                    padding: "24px 0",
                    color: "var(--ink-4)",
                    fontSize: 13,
                  }}
                >
                  This market has been cancelled.
                </p>
              )}

              {/* Expired / Resolving */}
              {isConnected &&
                !isMarketOpen &&
                !isMarketCancelled && (
                  <div
                    style={{
                      textAlign: "center",
                      padding: "24px 0",
                      color: "var(--ink-4)",
                      fontSize: 13,
                    }}
                  >
                    <p>
                      Market is{" "}
                      <strong style={{ color: "var(--ink-2)" }}>
                        {STATUS_LABELS[
                          market.status ?? 0
                        ]?.toLowerCase()}
                      </strong>
                      . Betting closed.
                    </p>
                  </div>
                )}

              {/* ── Active betting UI ────────────────────────────── */}
              {isConnected && isMarketOpen && (
                <>
                  {/* YES/NO side buttons */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 8,
                      marginBottom: 20,
                    }}
                  >
                    <SideButton
                      active={side === "YES"}
                      side="YES"
                      pct={yesPct}
                      onClick={() => setSide("YES")}
                      dim={side === "NO"}
                    />
                    <SideButton
                      active={side === "NO"}
                      side="NO"
                      pct={noPct}
                      onClick={() => setSide("NO")}
                      dim={side === "YES"}
                    />
                  </div>

                  {/* Amount input */}
                  <div style={{ marginBottom: 6 }}>
                    <div
                      className="mono"
                      style={{
                        fontSize: 10,
                        color: "var(--ink-3)",
                        letterSpacing: "0.16em",
                        textTransform: "uppercase",
                        marginBottom: 8,
                      }}
                    >
                      Amount
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        border: `1px solid ${isAmountBelowMin ? "var(--no)" : "var(--line-2)"}`,
                        borderRadius: 4,
                        padding: "10px 14px",
                        background: "var(--bg-0)",
                      }}
                    >
                      <input
                        className="mono"
                        value={amount}
                        onChange={(e) => {
                          setAmount(
                            e.target.value.replace(
                              /[^0-9.]/g,
                              ""
                            )
                          );
                          if (betStep !== "idle")
                            setBetStep("idle");
                        }}
                        style={{
                          flex: 1,
                          fontSize: 24,
                          color: "var(--ink-1)",
                          letterSpacing: "-0.01em",
                          background: "transparent",
                          border: "none",
                          outline: "none",
                        }}
                      />
                      <span
                        className="mono"
                        style={{
                          fontSize: 12,
                          color: "var(--ink-3)",
                        }}
                      >
                        cUSDT
                      </span>
                    </div>
                    {isAmountBelowMin && (
                      <p
                        style={{
                          fontSize: 11,
                          color: "var(--no)",
                          marginTop: 4,
                        }}
                      >
                        Minimum bet is {minimumBetCUSDT} cUSDT
                      </p>
                    )}
                  </div>

                  {/* Quick fill chips */}
                  <div
                    style={{
                      display: "flex",
                      gap: 6,
                      marginTop: 10,
                    }}
                  >
                    {quickAmounts.map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => {
                          setAmount(String(v));
                          if (betStep !== "idle")
                            setBetStep("idle");
                        }}
                        className="mono"
                        style={{
                          flex: 1,
                          padding: "7px 0",
                          fontSize: 11,
                          border: "1px solid var(--line)",
                          borderRadius: 3,
                          color:
                            amount === String(v)
                              ? "var(--ink-1)"
                              : "var(--ink-2)",
                          background:
                            amount === String(v)
                              ? "var(--bg-2)"
                              : "transparent",
                          cursor: "pointer",
                        }}
                      >
                        {v}
                      </button>
                    ))}
                  </div>

                  {/* Payout preview */}
                  <div
                    style={{
                      marginTop: 20,
                      padding: "14px 16px",
                      background: "var(--bg-0)",
                      border: "1px solid var(--line)",
                      borderRadius: 4,
                    }}
                  >
                    <div
                      className="mono"
                      style={{
                        fontSize: 10,
                        color: "var(--ink-3)",
                        letterSpacing: "0.16em",
                        textTransform: "uppercase",
                        marginBottom: 6,
                      }}
                    >
                      If correct
                    </div>
                    <div
                      className="mono"
                      style={{
                        fontSize: 16,
                        color: "var(--ink-1)",
                      }}
                    >
                      {payout.toFixed(2)}{" "}
                      <span
                        style={{
                          color: "var(--ink-3)",
                          fontSize: 12,
                        }}
                      >
                        cUSDT
                      </span>
                      <span
                        style={{
                          color:
                            profit >= 0
                              ? "var(--yes)"
                              : "var(--no)",
                          marginLeft: 10,
                          fontSize: 13,
                        }}
                      >
                        {profit >= 0 ? "+" : ""}
                        {profit.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Submit button */}
                  <button
                    type="button"
                    onClick={handlePlaceBet}
                    disabled={
                      betStep !== "idle" ||
                      amountNum <= 0 ||
                      isAmountBelowMin ||
                      isBetWriting ||
                      isBetConfirming
                    }
                    style={{
                      position: "relative",
                      width: "100%",
                      marginTop: 16,
                      padding: "14px 0",
                      fontSize: 13,
                      fontWeight: 500,
                      letterSpacing: "0.02em",
                      borderRadius: 4,
                      color:
                        side === "YES"
                          ? "#0C1510"
                          : "#150C0C",
                      background:
                        side === "YES"
                          ? "var(--yes)"
                          : "var(--no)",
                      borderLeft: `3px solid ${side === "YES" ? "var(--yes-dim, var(--yes))" : "var(--no-dim, var(--no))"}`,
                      borderTop: "none",
                      borderRight: "none",
                      borderBottom: "none",
                      opacity:
                        amountNum <= 0 ||
                        isAmountBelowMin
                          ? 0.45
                          : 1,
                      cursor:
                        amountNum <= 0 ||
                        isAmountBelowMin ||
                        betStep !== "idle"
                          ? "not-allowed"
                          : "pointer",
                      overflow: "hidden",
                      transition: "background 200ms",
                    }}
                  >
                    {betStep === "encrypting"
                      ? "Encrypting..."
                      : betStep === "approving"
                        ? "Approving cUSDT..."
                        : betStep === "writing" ||
                            isBetWriting
                          ? "Confirm in wallet..."
                          : isBetConfirming
                            ? "Confirming..."
                            : betStep === "confirmed"
                              ? "Done"
                              : "Place bet"}
                  </button>

                  {/* Fee/min info */}
                  <div
                    className="mono"
                    style={{
                      marginTop: 14,
                      fontSize: 10,
                      color: "var(--ink-3)",
                      textAlign: "center",
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                    }}
                  >
                    Fee 0% &middot; Min{" "}
                    {minimumBetCUSDT > 0
                      ? minimumBetCUSDT
                      : "--"}{" "}
                    cUSDT
                  </div>

                  {/* Error state */}
                  {betStep === "error" && (
                    <div
                      style={{
                        marginTop: 12,
                        padding: "10px 14px",
                        border: "1px solid var(--no)",
                        borderRadius: 4,
                        fontSize: 12,
                      }}
                    >
                      <p
                        style={{
                          color: "var(--no)",
                          fontWeight: 500,
                          marginBottom: 6,
                        }}
                      >
                        {fhe.error ||
                          bet.error?.message ||
                          "Something went wrong"}
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setBetStep("idle");
                          fhe.reset();
                        }}
                        style={{
                          fontSize: 11,
                          color: "var(--ink-2)",
                          border: "1px solid var(--line)",
                          borderRadius: 3,
                          padding: "4px 10px",
                          background: "transparent",
                          cursor: "pointer",
                        }}
                      >
                        Retry
                      </button>
                    </div>
                  )}

                  {bet.error && betStep !== "error" && (
                    <div
                      style={{
                        marginTop: 12,
                        padding: "10px 14px",
                        border: "1px solid var(--no)",
                        borderRadius: 4,
                      }}
                    >
                      <p
                        className="mono"
                        style={{
                          fontSize: 11,
                          color: "var(--no)",
                          wordBreak: "break-all",
                        }}
                      >
                        {bet.error.message}
                      </p>
                    </div>
                  )}
                </>
              )}
            </GlowCard>
          )}
        </aside>
      </div>
    </div>
  );
}
