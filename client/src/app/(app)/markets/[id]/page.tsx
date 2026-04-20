"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import { useAccount, useReadContract, useBlockNumber, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import {
  LockIcon,
  FHEBadge,
  Pill,
  RefreshIcon,
  CopyIcon,
  CheckIcon,
  ExternalIcon,
} from "@/components/shared/Icons";
import { OddsBar } from "@/components/shared/OddsBar";
import { EncryptedValue } from "@/components/shared/EncryptedValue";
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

const STATUS_PILL: Record<number, string> = {
  0: "open",
  1: "neutral",
  2: "neutral",
  3: "resolved",
  4: "cancelled",
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
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

/* ── Copy-to-clipboard inline button ───────────────────────────── */

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      className="btn ghost"
      type="button"
      style={{ padding: 0, height: "auto", minHeight: 0, marginLeft: 4 }}
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
    >
      {copied ? <CheckIcon size={10} /> : <CopyIcon size={10} />}
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
  const invalidateDecrypt = useNullCastStore((s) => s.invalidateDecryptedValues);
  const storedPositions = useNullCastStore((s) => s.positions);

  /* ── Local UI state ──────────────────────────────────────────── */
  const [side, setSide] = useState<"YES" | "NO">("YES");
  const [amount, setAmount] = useState("100");
  const [betStep, setBetStep] = useState<BetStep>("idle");

  /* ── Derived values ──────────────────────────────────────────── */
  const amountNum = parseFloat(amount) || 0;
  const yesPct = market.yesOdds;
  const noPct = market.noOdds;
  const selectedPct = side === "YES" ? yesPct : noPct;
  const multiplier =
    selectedPct > 0 ? (100 / selectedPct).toFixed(2) : "0.00";
  const payout = (amountNum * parseFloat(multiplier)).toFixed(2);
  const profit = (parseFloat(payout) - amountNum).toFixed(2);

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

  const quickAmounts = [25, 50, 100, 250];

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
      // Invalidate cached decrypted values so next decrypt fetches fresh
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

  /* ── Error / loading states ──────────────────────────────────── */
  if (!isValidId) {
    return (
      <div className="container" style={{ paddingTop: 80, textAlign: "center" }}>
        <p style={{ color: "var(--t-2)", marginBottom: 12 }}>Invalid market ID</p>
        <Link href="/markets" className="btn secondary">
          Back to Markets
        </Link>
      </div>
    );
  }

  if (isAddressLoading || (hasAddress && market.isLoading)) {
    return (
      <div className="container" style={{ paddingTop: 80, textAlign: "center" }}>
        <span className="mono" style={{ color: "var(--t-3)" }}>
          Loading market data from Sepolia...
        </span>
      </div>
    );
  }

  if (addressError || !hasAddress) {
    return (
      <div className="container" style={{ paddingTop: 80, textAlign: "center" }}>
        <p style={{ color: "var(--t-2)", marginBottom: 8 }}>
          Market #{marketId} not found
        </p>
        <p className="mono" style={{ color: "var(--t-4)", marginBottom: 20, fontSize: 12 }}>
          This market may not exist on the factory contract.
        </p>
        <Link href="/markets" className="btn secondary">
          Back to Markets
        </Link>
      </div>
    );
  }

  if (market.error) {
    return (
      <div className="container" style={{ paddingTop: 80, textAlign: "center" }}>
        <p style={{ color: "var(--t-2)", marginBottom: 8 }}>Error loading market</p>
        <p className="mono" style={{ color: "var(--t-4)", fontSize: 12 }}>
          {market.error.message}
        </p>
        <Link href="/markets" className="btn secondary" style={{ marginTop: 20 }}>
          Back to Markets
        </Link>
      </div>
    );
  }

  /* ── Resolved outcome label ──────────────────────────────────── */
  const resolvedLabel =
    market.resolvedOutcome === BigInt(1)
      ? "YES"
      : market.resolvedOutcome === BigInt(0)
        ? "NO"
        : market.resolvedOutcome?.toString() ?? "--";

  /* ── Detail items for market details card ─────────────────────── */
  const detailItems: {
    label: string;
    value: string;
    mono?: boolean;
    copy?: string;
  }[] = [
    {
      label: "Market type",
      value: MARKET_TYPE_LABELS[market.marketType ?? 0] ?? "Binary",
    },
    {
      label: "Category",
      value: market.category || "--",
    },
    { label: "Fee", value: "0%" },
    {
      label: "Min bet",
      value: market.minimumBet ? `${fmtCUSDT(market.minimumBet)} cUSDT` : "--",
    },
    {
      label: "Oracle",
      value: market.oracle ? truncAddr(market.oracle) : "--",
      mono: true,
      copy: market.oracle,
    },
    {
      label: "Contract",
      value: resolvedAddress ? truncAddr(resolvedAddress) : "--",
      mono: true,
      copy: resolvedAddress,
    },
    {
      label: "Expiry block",
      value: market.expiryBlock ? market.expiryBlock.toString() : "--",
      mono: true,
    },
    {
      label: "YES pool",
      value: `${market.yesPool.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} cUSDT`,
    },
    {
      label: "NO pool",
      value: `${market.noPool.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} cUSDT`,
    },
    {
      label: "Rep required",
      value: "None",
    },
  ];

  /* ── Placeholder activity rows ───────────────────────────────── */
  const placeholderActivity = [
    { side: "YES", bettor: "0x1a2b...9c0d", block: "--", time: "--" },
    { side: "NO", bettor: "0x3e4f...a1b2", block: "--", time: "--" },
    { side: "YES", bettor: "0x5c6d...e3f4", block: "--", time: "--" },
  ];

  /* ── Render ──────────────────────────────────────────────────── */
  return (
    <div className="container" style={{ paddingTop: 28, paddingBottom: 80 }}>
      <div
        className="detail-2col"
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0,1fr) 380px",
          gap: 28,
          alignItems: "start",
        }}
      >
        {/* ================================================================
            LEFT COLUMN
            ================================================================ */}
        <div className="stack gap-4">
          {/* Pills row */}
          <div className="row gap-2" style={{ flexWrap: "wrap" }}>
            <Pill variant="cat">
              {MARKET_TYPE_LABELS[market.marketType ?? 0] ?? "Binary"}
            </Pill>
            {market.category && (
              <Pill>{market.category}</Pill>
            )}
            {market.status !== undefined && (
              <Pill variant={STATUS_PILL[market.status] ?? ""}>
                {STATUS_LABELS[market.status] ?? "UNKNOWN"}
              </Pill>
            )}
            {market.disputed && (
              <Pill variant="cancelled">DISPUTED</Pill>
            )}
            <FHEBadge />
            {market.expiryBlock && (
              <Pill>Block {market.expiryBlock.toString()}</Pill>
            )}
            <Pill className="mono">#{marketId}</Pill>
          </div>

          {/* Question */}
          <h1
            className="display"
            style={{
              fontSize: 42,
              letterSpacing: "-0.03em",
              lineHeight: 1.1,
            }}
          >
            {market.question ?? "Loading..."}
          </h1>

          {/* ── Odds card ──────────────────────────────────────── */}
          <div className="card elevated" style={{ padding: "20px 24px" }}>
            <div className="row between" style={{ marginBottom: 16 }}>
              <span className="eyebrow">Aggregate odds</span>
              <button
                className="btn ghost"
                type="button"
                onClick={() => {
                  oddsKeeper.updateOdds();
                  setTimeout(() => market.refetch(), 15_000);
                }}
                disabled={oddsKeeper.isUpdating}
                style={{ gap: 4, fontSize: 12 }}
              >
                <RefreshIcon size={11} />
                {oddsKeeper.isUpdating ? "Decrypting..." : "Refresh odds"}
              </button>
            </div>
            <OddsBar yes={yesPct} no={noPct} size="lg" />
            <div
              className="row between"
              style={{ marginTop: 10, fontSize: 11, color: "var(--t-3)" }}
            >
              <span className="mono">
                Pool: {market.totalPool.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} cUSDT
              </span>
              <span className="row gap-2" style={{ gap: 6 }}>
                <span
                  className="dot-live"
                  style={{ width: 6, height: 6, display: "inline-block" }}
                />
                <span className="mono">Live</span>
              </span>
            </div>
          </div>

          {/* ── Market details card ────────────────────────────── */}
          <div className="card">
            <div className="card-head">
              <span>Market details</span>
              <span className="mono" style={{ fontSize: 11, color: "var(--t-3)" }}>
                Sepolia
              </span>
            </div>
            <div className="card-body">
              <div className="grid-3">
                {detailItems.map((item) => (
                  <div key={item.label}>
                    <div className="eyebrow">{item.label}</div>
                    <div
                      className={item.mono ? "mono" : ""}
                      style={{
                        fontSize: 13,
                        color: "var(--t-1)",
                        display: "flex",
                        alignItems: "center",
                      }}
                    >
                      {item.value}
                      {item.copy && <CopyBtn text={item.copy} />}
                    </div>
                  </div>
                ))}
              </div>
              {resolvedAddress && (
                <a
                  href={`https://sepolia.etherscan.io/address/${resolvedAddress}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn ghost"
                  style={{
                    marginTop: 16,
                    fontSize: 11,
                    gap: 4,
                    display: "inline-flex",
                  }}
                >
                  <ExternalIcon size={10} />
                  View on Etherscan
                </a>
              )}
            </div>
          </div>

          {/* ── Activity table ─────────────────────────────────── */}
          <div className="card">
            <div className="card-head">
              <span>Recent activity</span>
              <Pill variant="enc">Amounts encrypted</Pill>
            </div>
            <div className="card-body" style={{ padding: 0 }}>
              <table className="table" style={{ width: "100%" }}>
                <thead>
                  <tr>
                    <th>Side</th>
                    <th>Bettor</th>
                    <th>Amount</th>
                    <th>Block</th>
                    <th>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {placeholderActivity.map((row, i) => (
                    <tr key={i}>
                      <td>
                        <span className={`pill ${row.side === "YES" ? "yes" : "no"}`}>
                          {row.side}
                        </span>
                      </td>
                      <td className="mono">{row.bettor}</td>
                      <td>
                        <EncryptedValue state="hidden" compact />
                      </td>
                      <td className="mono">{row.block}</td>
                      <td style={{ color: "var(--t-4)" }}>{row.time}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* ================================================================
            RIGHT COLUMN
            ================================================================ */}
        <div style={{ position: "sticky", top: 80 }}>
          {/* ── Resolved outcome card (shown instead of betting panel) ── */}
          {isMarketResolved && (
            <div className="card elevated" style={{ marginBottom: 16 }}>
              <div className="card-head">
                <span>Resolved</span>
                <FHEBadge />
              </div>
              <div className="card-body" style={{ textAlign: "center" }}>
                <div className="eyebrow" style={{ marginBottom: 6 }}>
                  Outcome
                </div>
                <div
                  className="display"
                  style={{
                    fontSize: 32,
                    color:
                      resolvedLabel === "YES"
                        ? "var(--yes)"
                        : resolvedLabel === "NO"
                          ? "var(--no)"
                          : "var(--t-1)",
                  }}
                >
                  {resolvedLabel}
                </div>

                {isConnected && hasPosition && !hasClaimed && (
                  <button
                    className="btn lg block yes"
                    onClick={handleClaim}
                    disabled={claim.isWriting || claim.isConfirming}
                    type="button"
                    style={{ marginTop: 20 }}
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
                    className="row"
                    style={{
                      justifyContent: "center",
                      marginTop: 16,
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
                      color: "var(--t-4)",
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
            </div>
          )}

          {/* ── Dispute window card (shown when market is resolved) ── */}
          {isMarketResolved && (() => {
            const resolvedAt = market.resolvedAtBlock;
            const window = market.disputeWindow;
            const isDisputed = market.disputed || isDisputeConfirmed;

            if (!resolvedAt || !window) return null;

            const deadline = resolvedAt + window;
            const blocksRemaining = currentBlock
              ? Number(deadline) - Number(currentBlock)
              : null;
            const windowOpen = blocksRemaining !== null && blocksRemaining > 0;

            return (
              <div className="card" style={{ marginBottom: 16 }}>
                <div className="card-head">
                  <span>Dispute window</span>
                  {isDisputed && (
                    <span className="pill" style={{ background: "var(--no-bg)", color: "var(--no-hi)", borderColor: "var(--no-bd)" }}>
                      Under dispute
                    </span>
                  )}
                </div>
                <div className="card-body">
                  {isDisputed ? (
                    <div style={{ textAlign: "center", padding: "8px 0" }}>
                      <p style={{ fontSize: 13, color: "var(--no-hi)", fontWeight: 500, marginBottom: 4 }}>
                        This market has been disputed
                      </p>
                      <p style={{ fontSize: 12, color: "var(--t-3)", margin: 0 }}>
                        Resolution is under review by the oracle.
                      </p>
                    </div>
                  ) : windowOpen ? (
                    <div>
                      <div className="row between" style={{ marginBottom: 12, fontSize: 13 }}>
                        <span style={{ color: "var(--t-3)" }}>Blocks remaining</span>
                        <span className="mono" style={{ color: "var(--t-1)", fontWeight: 600 }}>
                          {blocksRemaining!.toLocaleString()}
                        </span>
                      </div>
                      <div className="row between" style={{ marginBottom: 12, fontSize: 12 }}>
                        <span style={{ color: "var(--t-4)" }}>Deadline block</span>
                        <span className="mono" style={{ color: "var(--t-3)" }}>
                          #{deadline.toString()}
                        </span>
                      </div>
                      {/* Progress bar */}
                      <div style={{
                        width: "100%",
                        height: 4,
                        background: "var(--border-1)",
                        borderRadius: 2,
                        marginBottom: 14,
                        overflow: "hidden",
                      }}>
                        <div style={{
                          width: `${Math.max(0, Math.min(100, ((Number(window) - blocksRemaining!) / Number(window)) * 100))}%`,
                          height: "100%",
                          background: "var(--acc)",
                          borderRadius: 2,
                          transition: "width 0.3s ease",
                        }} />
                      </div>
                      {isConnected && (
                        <button
                          className="btn secondary block"
                          type="button"
                          onClick={handleRaiseDispute}
                          disabled={isDisputeWriting || isDisputeConfirming}
                        >
                          {isDisputeWriting
                            ? "Confirm in wallet..."
                            : isDisputeConfirming
                              ? "Confirming..."
                              : "Raise Dispute"}
                        </button>
                      )}
                      {(disputeWriteError || disputeConfirmError) && (
                        <p
                          className="mono"
                          style={{
                            fontSize: 11,
                            color: "var(--no)",
                            marginTop: 8,
                            wordBreak: "break-all",
                          }}
                        >
                          {(disputeWriteError || disputeConfirmError)?.message}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div style={{ textAlign: "center", padding: "8px 0" }}>
                      <p style={{ fontSize: 13, color: "var(--t-3)", margin: 0 }}>
                        Dispute window closed
                      </p>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          {/* ── Betting panel (only when not resolved) ─────────── */}
          {!isMarketResolved && (
            <div className="card elevated">
              <div className="card-head">
                <span>
                  {isMarketCancelled ? "Market cancelled" : "Place bet"}
                </span>
                <FHEBadge />
              </div>
              <div className="card-body" style={{ padding: "16px 18px" }}>
                {/* Not connected */}
                {!isConnected && (
                  <p
                    style={{
                      textAlign: "center",
                      padding: "32px 0",
                      color: "var(--t-4)",
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
                      color: "var(--t-4)",
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
                        color: "var(--t-4)",
                        fontSize: 13,
                      }}
                    >
                      <p>
                        Market is{" "}
                        <strong style={{ color: "var(--t-2)" }}>
                          {STATUS_LABELS[market.status ?? 0]?.toLowerCase()}
                        </strong>
                        . Betting closed.
                      </p>
                    </div>
                  )}

                {/* ── Active betting UI ────────────────────────── */}
                {isConnected && isMarketOpen && (
                  <>
                    {/* Side selector */}
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: 8,
                        marginBottom: 20,
                      }}
                    >
                      <button
                        className="card inter"
                        type="button"
                        onClick={() => setSide("YES")}
                        style={{
                          cursor: "pointer",
                          textAlign: "left",
                          padding: "16px 14px",
                          background: side === "YES" ? "var(--yes-bg)" : undefined,
                          borderColor: side === "YES" ? "var(--yes-bd)" : undefined,
                        }}
                      >
                        <div
                          className="display"
                          style={{
                            fontSize: 22,
                            color: side === "YES" ? "var(--yes-hi)" : "var(--t-2)",
                          }}
                        >
                          YES
                        </div>
                        <div className="mono" style={{ fontSize: 11, color: "var(--t-3)", marginTop: 6 }}>
                          {yesPct}% · ×{yesPct > 0 ? (100 / yesPct).toFixed(2) : "0.00"}
                        </div>
                      </button>
                      <button
                        className="card inter"
                        type="button"
                        onClick={() => setSide("NO")}
                        style={{
                          cursor: "pointer",
                          textAlign: "left",
                          padding: "16px 14px",
                          background: side === "NO" ? "var(--no-bg)" : undefined,
                          borderColor: side === "NO" ? "var(--no-bd)" : undefined,
                        }}
                      >
                        <div
                          className="display"
                          style={{
                            fontSize: 22,
                            color: side === "NO" ? "var(--no-hi)" : "var(--t-2)",
                          }}
                        >
                          NO
                        </div>
                        <div className="mono" style={{ fontSize: 11, color: "var(--t-3)", marginTop: 6 }}>
                          {noPct}% · ×{noPct > 0 ? (100 / noPct).toFixed(2) : "0.00"}
                        </div>
                      </button>
                    </div>

                    {/* Amount field */}
                    <div className="field" style={{ marginBottom: 10 }}>
                      <label className="eyebrow">
                        Amount
                        {minimumBetCUSDT > 0 && (
                          <span style={{ textTransform: "none", marginLeft: 6, fontWeight: 400 }}>
                            (min {minimumBetCUSDT})
                          </span>
                        )}
                      </label>
                      <div className="input-row">
                        <input
                          className="input input-mono"
                          type="text"
                          value={amount}
                          onChange={(e) => {
                            setAmount(e.target.value);
                            if (betStep !== "idle") setBetStep("idle");
                          }}
                          style={{
                            ...(isAmountBelowMin
                              ? { borderColor: "var(--no)" }
                              : {}),
                          }}
                        />
                        <span className="unit">cUSDT</span>
                      </div>
                      {isAmountBelowMin && (
                        <p style={{ fontSize: 11, color: "var(--no)", marginTop: 4 }}>
                          Minimum bet is {minimumBetCUSDT} cUSDT
                        </p>
                      )}
                    </div>

                    {/* Quick amount buttons */}
                    <div className="row gap-2" style={{ marginBottom: 16 }}>
                      {quickAmounts.map((qa) => (
                        <button
                          key={qa}
                          className={`btn sm ${amount === String(qa) ? "primary" : "ghost"}`}
                          type="button"
                          onClick={() => {
                            setAmount(String(qa));
                            if (betStep !== "idle") setBetStep("idle");
                          }}
                          style={{ flex: 1, justifyContent: "center" }}
                        >
                          {qa}
                        </button>
                      ))}
                    </div>

                    {/* Payout box */}
                    <div
                      style={{
                        background: "var(--bg-1)",
                        border: "1px solid var(--border-1)",
                        borderRadius: 8,
                        padding: "14px 16px",
                        marginBottom: 16,
                        fontSize: 13,
                      }}
                    >
                      <div className="row between" style={{ marginBottom: 6 }}>
                        <span style={{ color: "var(--t-3)" }}>Stake</span>
                        <span className="num">{amountNum.toLocaleString()} cUSDT</span>
                      </div>
                      <div className="row between" style={{ marginBottom: 10 }}>
                        <span style={{ color: "var(--t-3)" }}>Odds</span>
                        <span className="num">{multiplier}x</span>
                      </div>
                      <hr className="divider" />
                      <div className="row between" style={{ marginTop: 10, marginBottom: 4, fontWeight: 600 }}>
                        <span>Payout if correct</span>
                        <span className="num">
                          {parseFloat(payout).toLocaleString()} cUSDT
                        </span>
                      </div>
                      <div className="row between">
                        <span style={{ color: "var(--t-3)" }}>Profit</span>
                        <span
                          className="num"
                          style={{
                            fontWeight: 600,
                            color: side === "YES" ? "var(--yes)" : "var(--no)",
                          }}
                        >
                          +{parseFloat(profit).toLocaleString()} cUSDT
                        </span>
                      </div>
                    </div>

                    {/* Submit button */}
                    <button
                      className={`btn lg block ${side === "YES" ? "yes" : "no"}`}
                      onClick={handlePlaceBet}
                      disabled={
                        betStep !== "idle" ||
                        amountNum <= 0 ||
                        isAmountBelowMin ||
                        isBetWriting ||
                        isBetConfirming
                      }
                      type="button"
                      style={{ marginBottom: 12, height: 48, fontSize: 14, fontWeight: 500 }}
                    >
                      {betStep === "encrypting"
                        ? "Encrypting..."
                        : betStep === "approving"
                          ? "Approving cUSDT..."
                          : betStep === "writing" || isBetWriting
                            ? "Confirm in wallet..."
                            : isBetConfirming
                              ? "Confirming..."
                              : betStep === "confirmed"
                                ? "Bet placed"
                                : `Bet ${side} · ${amountNum} cUSDT`}
                    </button>

                    {/* Error state */}
                    {betStep === "error" && (
                      <div
                        style={{
                          background: "var(--no-bg)",
                          border: "1px solid var(--no-bd)",
                          borderRadius: 8,
                          padding: "10px 14px",
                          marginBottom: 12,
                          fontSize: 12,
                        }}
                      >
                        <p style={{ color: "var(--no)", fontWeight: 500, marginBottom: 6 }}>
                          {fhe.error || bet.error?.message || "Something went wrong"}
                        </p>
                        <button
                          className="btn sm ghost"
                          type="button"
                          onClick={() => {
                            setBetStep("idle");
                            fhe.reset();
                          }}
                        >
                          Retry
                        </button>
                      </div>
                    )}

                    {bet.error && betStep !== "error" && (
                      <div
                        style={{
                          background: "var(--no-bg)",
                          border: "1px solid var(--no-bd)",
                          borderRadius: 8,
                          padding: "10px 14px",
                          marginBottom: 12,
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

                    {/* Privacy notice */}
                    <div
                      style={{
                        background: "var(--enc-bg)",
                        border: "1px solid var(--enc-bd)",
                        borderRadius: 8,
                        padding: "10px 14px",
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 8,
                      }}
                    >
                      <LockIcon size={11} />
                      <div style={{ fontSize: 11, color: "var(--enc)", lineHeight: 1.5 }}>
                        <strong>Your bet is encrypted</strong>
                        <br />
                        Nobody can see your position. Only aggregate odds are public.
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* ── Position section ────────────────────────────────── */}
          {(hasPosition || localPositions.length > 0) && (
            <div className="card" style={{ marginTop: 16 }}>
              <div className="card-head">
                <span className="row gap-2" style={{ gap: 6 }}>
                  <LockIcon size={11} /> Your position
                </span>
                {userDecrypt.isDecrypted && (
                  <button
                    className="btn sm ghost"
                    type="button"
                    onClick={userDecrypt.refresh}
                    disabled={userDecrypt.isDecrypting}
                    style={{ fontSize: 11, gap: 4 }}
                  >
                    <RefreshIcon size={10} />
                    {userDecrypt.isCached ? "Cached" : "Refresh"}
                  </button>
                )}
              </div>
              <div className="card-body">
                {userDecrypt.isDecrypted ? (
                  <div className="stack gap-4" style={{ gap: 8 }}>
                    {userDecrypt.yesAmount !== null &&
                      userDecrypt.yesAmount > BigInt(0) && (
                        <div className="row between" style={{ padding: "8px 0" }}>
                          <span className="pill yes">YES</span>
                          <span className="reveal num" style={{ fontSize: 15 }}>
                            {(
                              Number(userDecrypt.yesAmount) / 1e6
                            ).toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                            <span
                              style={{
                                marginLeft: 4,
                                color: "var(--t-3)",
                                fontSize: 11,
                              }}
                            >
                              cUSDT
                            </span>
                          </span>
                        </div>
                      )}
                    {userDecrypt.noAmount !== null &&
                      userDecrypt.noAmount > BigInt(0) && (
                        <div className="row between" style={{ padding: "8px 0" }}>
                          <span className="pill no">NO</span>
                          <span className="reveal num" style={{ fontSize: 15 }}>
                            {(
                              Number(userDecrypt.noAmount) / 1e6
                            ).toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                            <span
                              style={{
                                marginLeft: 4,
                                color: "var(--t-3)",
                                fontSize: 11,
                              }}
                            >
                              cUSDT
                            </span>
                          </span>
                        </div>
                      )}
                  </div>
                ) : (
                  <div>
                    <div className="row between" style={{ marginBottom: 10 }}>
                      <span className="enc-val" style={{ fontSize: 13 }}>
                        <LockIcon size={11} />
                        <span className="dots mono">•••••••</span>
                        <span style={{ color: "var(--t-4)", fontSize: 11 }}>cUSDT</span>
                      </span>
                      <button
                        className="btn sm secondary"
                        onClick={userDecrypt.decrypt}
                        disabled={userDecrypt.isDecrypting}
                        type="button"
                      >
                        {userDecrypt.isDecrypting ? "Decrypting..." : "Decrypt"}
                      </button>
                    </div>
                    {userDecrypt.error && (
                      <p style={{ fontSize: 11, color: "var(--no)", marginTop: 4 }}>
                        {userDecrypt.error}
                      </p>
                    )}
                  </div>
                )}

                {/* Bet history */}
                {localPositions.length > 0 && (
                  <>
                    <hr className="divider" style={{ margin: "14px 0 10px" }} />
                    <div className="eyebrow" style={{ marginBottom: 8 }}>
                      Bet history (this session)
                    </div>
                    <div className="stack gap-4" style={{ gap: 6 }}>
                      {localPositions.map((pos, i) => (
                        <div
                          key={pos.txHash || i}
                          className="row between"
                          style={{ fontSize: 12, padding: "4px 0" }}
                        >
                          <div className="row gap-2" style={{ gap: 6 }}>
                            <span
                              className={`pill ${pos.side === "YES" ? "yes" : "no"}`}
                              style={{ fontSize: 10 }}
                            >
                              {pos.side}
                            </span>
                            <span className="mono">
                              {pos.amount} cUSDT
                            </span>
                          </div>
                          <span
                            className="mono"
                            style={{ color: "var(--t-4)" }}
                          >
                            @ {pos.entryOdds}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
