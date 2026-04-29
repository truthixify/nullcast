"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import {
  useAccount,
  useReadContract,
  useBlockNumber,
  useWriteContract,
  useWaitForTransactionReceipt,
  useWatchContractEvent,
} from "wagmi";
import {
  ArrowLeft,
  Eye,
  Check,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";
import { OddsBar } from "@/components/nc/OddsBar";
import { GlowCard } from "@/components/nc/GlowCard";
import { RevealNumber } from "@/components/nc/RevealNumber";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useMarket, useHasPosition } from "@/hooks/useMarket";
import { usePlaceBet } from "@/hooks/usePlaceBet";
import { useClaimWinnings } from "@/hooks/useClaimWinnings";
import { useApproveCUSDT } from "@/hooks/useCUSDT";
import { useFHEEncrypt } from "@/hooks/useFHEVM";
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

function fmtExpiry(expiryBlock: bigint | undefined, currentBlock: bigint | undefined): string {
  if (!expiryBlock) return "--";
  if (!currentBlock) return `Block ${expiryBlock.toString()}`;
  const diff = Number(expiryBlock) - Number(currentBlock);
  if (diff <= 0) return "Expired";
  const seconds = diff * 12;
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  if (days > 30) return `${Math.floor(days / 30)}mo ${days % 30}d`;
  if (days > 0) return `${days}d ${hours}h`;
  return `${hours}h ${Math.floor((seconds % 3600) / 60)}m`;
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
      <div className="text-[9px] text-fg-4 tracking-[0.18em] uppercase mb-1">
        {label}
      </div>
      <div className="font-mono text-fg-2 text-[11px]">
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
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        relative py-4 rounded text-center cursor-pointer transition-all duration-200
        ${active
          ? isYes
            ? "border border-yes border-l-[3px] bg-yes/[0.08]"
            : "border border-no border-l-[3px] bg-no/[0.08]"
          : "border border-subtle bg-background"
        }
        ${dim ? "opacity-40" : "opacity-100"}
        ${active ? "scale-100" : "scale-[0.98]"}
      `}
    >
      <div className={`font-mono text-[11px] tracking-[0.18em] font-medium ${isYes ? "text-yes" : "text-no"}`}>
        {side}
      </div>
      <div className="font-mono text-xl text-fg mt-1.5 tracking-tight">
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
  // odds keeper removed — using /api/keeper server-side instead
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
      // Auto-decrypt position after bet to show updated total
      setTimeout(() => userDecrypt.refresh(), 3000);
      // Wait for RPC to reflect the new state, then fetch fresh odds from relayer.
      // The relayer needs the updated handle to be readable, so we delay to avoid
      // fetching stale pre-bet values.
      setTimeout(() => market.refreshOdds(), 8000);
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
    market,
    userDecrypt,
  ]);

  /* ── Claim handler ───────────────────────────────────────────── */
  const handleClaim = useCallback(() => {
    if (!isConnected || !hasAddress) return;
    claim.claimWinnings();
  }, [isConnected, hasAddress, claim]);

  /* ── Live activity feed from BetPlaced events ────────────────── */
  const [activity, setActivity] = useState<Array<{ side: string; addr: string; block: string; mine: boolean }>>([]);
  const [isSyncing, setIsSyncing] = useState(false);

  // Auto-sync odds on page load
  const hasSynced = useRef(false);
  useEffect(() => {
    if (hasAddress && !hasSynced.current) {
      hasSynced.current = true;
      market.refreshOdds();
    }
  }, [hasAddress, market]);

  const handleSyncOdds = async () => {
    setIsSyncing(true);
    try {
      await market.refreshOdds();
    } catch { /* ignore */ }
    setIsSyncing(false);
  };

  const betPlacedAbi = [{ type: "event" as const, name: "BetPlaced", inputs: [{ name: "bettor", type: "address", indexed: true }, { name: "marketId", type: "uint256", indexed: true }, { name: "isYes", type: "bool", indexed: false }] }];

  // Watch for new events
  useWatchContractEvent({
    address: hasAddress ? resolvedAddress : undefined,
    abi: betPlacedAbi,
    eventName: "BetPlaced",
    enabled: hasAddress,
    onLogs(logs: unknown[]) {
      const newEntries = (logs as Array<{ args: { isYes?: boolean; bettor?: string }; blockNumber?: bigint }>).map((log) => ({
        side: log.args.isYes ? "YES" : "NO",
        addr: `${(log.args.bettor ?? "0x0000").slice(0, 6)}\u2026${(log.args.bettor ?? "0x0000").slice(-4)}`,
        block: log.blockNumber?.toString() ?? "--",
        mine: (log.args.bettor ?? "").toLowerCase() === userAddress?.toLowerCase(),
      }));
      setActivity((prev) => [...newEntries, ...prev].slice(0, 10));
    },
  });

  // Fetch historical events on mount via RPC
  useEffect(() => {
    if (!hasAddress || !resolvedAddress) return;
    const rpc = process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL || "https://ethereum-sepolia-rpc.publicnode.com";
    fetch(rpc, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_getLogs", params: [{ address: resolvedAddress, fromBlock: "0x0", toBlock: "latest", topics: [null] }] }),
    }).then(r => r.json()).then(data => {
      if (!data.result || data.result.length === 0) return;
      const entries = data.result.slice(-10).reverse().map((log: { topics: string[]; blockNumber: string }) => {
        const bettor = log.topics[1] ? "0x" + log.topics[1].slice(26) : "0x0000";
        const isYes = log.topics.length > 2; // simplified
        return {
          side: isYes ? "YES" : "NO",
          addr: `${bettor.slice(0, 6)}\u2026${bettor.slice(-4)}`,
          block: parseInt(log.blockNumber, 16).toString(),
          mine: bettor.toLowerCase() === userAddress?.toLowerCase(),
        };
      });
      if (entries.length > 0) setActivity(entries);
    }).catch(() => {});
  }, [hasAddress, resolvedAddress, userAddress]);

  /* ── Resolved outcome label ──────────────────────────────────── */
  const resolvedLabel =
    market.resolvedOutcome === BigInt(1)
      ? "YES"
      : market.resolvedOutcome === BigInt(0)
        ? "NO"
        : market.resolvedOutcome?.toString() ?? "--";

  /* ── Position display value for RevealNumber ─────────────────── */
  const positionData = useMemo(() => {
    if (!userDecrypt.isDecrypted) return { yes: 0, no: 0, total: "0.00" };
    const yes = userDecrypt.yesAmount ? Number(userDecrypt.yesAmount) / 1e6 : 0;
    const no = userDecrypt.noAmount ? Number(userDecrypt.noAmount) / 1e6 : 0;
    const total = (yes + no).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return { yes, no, total };
  }, [userDecrypt.isDecrypted, userDecrypt.yesAmount, userDecrypt.noAmount]);

  /* ── Error / loading states ──────────────────────────────────── */
  if (!isValidId) {
    return (
      <div className="animate-fade-in max-w-7xl mx-auto px-6 md:px-12 py-20 text-center">
        <p className="text-fg-2 mb-3">
          Invalid market ID
        </p>
        <Link
          href="/markets"
          className="inline-flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Markets
        </Link>
      </div>
    );
  }

  if (isAddressLoading || (hasAddress && market.isLoading)) {
    return (
      <div className="animate-fade-in max-w-7xl mx-auto px-6 md:px-12 py-20">
        <div className="mb-6">
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="grid lg:grid-cols-[1fr_400px] gap-8 lg:gap-10">
          <div className="space-y-6">
            <Skeleton className="h-12 w-3/4" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-3 w-full" />
            <div className="flex gap-8">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
          <div>
            <Skeleton className="h-[400px] w-full rounded-md" />
          </div>
        </div>
      </div>
    );
  }

  if (addressError || !hasAddress) {
    return (
      <div className="animate-fade-in max-w-7xl mx-auto px-6 md:px-12 py-20 text-center">
        <p className="text-fg-2 mb-2">
          Market #{marketId} not found
        </p>
        <p className="font-mono text-fg-4 mb-5 text-xs">
          This market may not exist on the factory contract.
        </p>
        <Link
          href="/markets"
          className="inline-flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Markets
        </Link>
      </div>
    );
  }

  if (market.error) {
    return (
      <div className="animate-fade-in max-w-7xl mx-auto px-6 md:px-12 py-20 text-center">
        <p className="text-fg-2 mb-2">
          Error loading market
        </p>
        <p className="font-mono text-fg-4 text-xs">
          {market.error.message}
        </p>
        <Link
          href="/markets"
          className="inline-flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors mt-5"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Markets
        </Link>
      </div>
    );
  }

  /* ── Render ──────────────────────────────────────────────────── */
  return (
    <div className="animate-fade-in max-w-7xl mx-auto px-6 md:px-12 pt-8 pb-20">
      {/* Breadcrumb */}
      <div className="mb-6">
        <Link
          href="/markets"
          className="inline-flex items-center gap-2 text-sm text-fg-3 hover:text-fg-2 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Markets
        </Link>
        <span className="font-mono text-[11px] text-fg-4 mx-2.5">/</span>
        <span className="font-mono text-[11px] text-fg-3 tracking-wider uppercase">
          {market.category || MARKET_TYPE_LABELS[market.marketType ?? 0] || "Binary"}
        </span>
      </div>

      <div className="grid lg:grid-cols-[1fr_400px] gap-8 lg:gap-10 items-start">
        {/* ================================================================
            LEFT COLUMN
            ================================================================ */}
        <div>
          {/* Question */}
          <h1 className="font-display text-[clamp(28px,4vw,42px)] font-medium tracking-tight leading-[1.15] text-fg text-balance">
            {market.question ?? "Loading..."}
          </h1>

          {/* Big odds bar */}
          <div className="mt-10">
            <OddsBar
              yes={yesPct}
              height={12}
              showLabels={false}
            />
            <div className="flex justify-between mt-3.5">
              <div>
                <div className="font-mono text-[30px] text-yes font-medium tracking-tight">
                  {yesPct.toFixed(1)}%
                </div>
                <div className="font-mono text-[10px] text-fg-3 tracking-[0.16em] uppercase mt-1">
                  YES
                </div>
              </div>
              <div className="text-right">
                <div className="font-mono text-[30px] text-no font-medium tracking-tight">
                  {noPct.toFixed(1)}%
                </div>
                <div className="font-mono text-[10px] text-fg-3 tracking-[0.16em] uppercase mt-1">
                  NO
                </div>
              </div>
            </div>
          </div>

          {/* Pool row */}
          <div className="font-mono mt-8 py-5 border-y border-subtle flex items-center gap-8 text-[13px] text-fg-2">
            <span className="flex items-center gap-2">
              <span className="live-dot" />
              <span className="text-fg">
                {formatPool(market.totalPool)}
              </span>
              <span className="text-fg-3 text-[11px]">
                pool
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSyncOdds}
                disabled={isSyncing}
                className="h-6 px-2 text-[10px] font-mono"
              >
                <RefreshCw className={`w-3 h-3 ${isSyncing ? "animate-spin" : ""}`} />
                {isSyncing ? "syncing" : "sync"}
              </Button>
            </span>
            <span className="text-fg-4">&middot;</span>
            <span>
              <span className="text-fg">
                {fmtExpiry(market.expiryBlock, currentBlock ?? undefined)}
              </span>
              <span className="text-fg-3 text-[11px] ml-1.5">
                expiry
              </span>
            </span>
          </div>

          {/* Your position (compact) */}
          {(hasPosition || localPositions.length > 0) && (
            <div className="mt-6 px-4 py-3.5 border border-subtle rounded flex items-center gap-6">
              <span className="font-mono text-[10px] text-fg-3 tracking-[0.16em] uppercase">
                Your position
              </span>
              {userDecrypt.isDecrypted ? (
                <span className="flex items-center gap-4 flex-wrap">
                  {positionData.yes > 0 && (
                    <span className="font-mono text-[13px] flex items-center gap-1.5">
                      <span className="text-yes font-medium">YES</span>
                      <RevealNumber value={positionData.yes.toFixed(2)} revealed={positionReveal} />
                    </span>
                  )}
                  {positionData.no > 0 && (
                    <span className="font-mono text-[13px] flex items-center gap-1.5">
                      <span className="text-no font-medium">NO</span>
                      <RevealNumber value={positionData.no.toFixed(2)} revealed={positionReveal} />
                    </span>
                  )}
                  <span className="text-fg-3 text-[11px]">cUSDT</span>
                </span>
              ) : (
                <span className="font-mono text-sm text-fg-3">
                  {"\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022"}
                  <span className="text-fg-3 ml-1.5 text-[11px]">cUSDT</span>
                </span>
              )}
              <div className="flex-1" />
              {userDecrypt.isDecrypted ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPositionReveal(true)}
                  disabled={positionReveal}
                  className={positionReveal ? "text-fg-3 border-subtle" : "text-primary border-primary/30"}
                >
                  <Eye className="w-3 h-3" />
                  {positionReveal ? "Revealed" : "Reveal"}
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={userDecrypt.decrypt}
                  disabled={userDecrypt.isDecrypting}
                  className="text-primary border-primary/30"
                >
                  <Eye className="w-3 h-3" />
                  {userDecrypt.isDecrypting ? "Decrypting..." : "Reveal"}
                </Button>
              )}
            </div>
          )}

          {/* Metadata grid */}
          <div className="mt-9 grid grid-cols-2 sm:grid-cols-4 gap-5">
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

          {/* Recent activity */}
          <div className="mt-12">
            <div className="flex items-baseline justify-between mb-3.5">
              <h2 className="font-display text-xl font-medium tracking-tight">
                Recent activity
              </h2>
              <span className="font-mono text-[10px] text-fg-3 tracking-[0.14em] uppercase flex items-center gap-2">
                <span className="live-dot" /> live
              </span>
            </div>
            <div className="border border-subtle rounded bg-surface-1 overflow-hidden">
              {activity.length === 0 && (
                <div className="py-6 px-4 text-center text-fg-3 text-xs">
                  No bets placed yet. Activity appears here in real-time.
                </div>
              )}
              {activity.map((row, i) => (
                <div
                  key={i}
                  className={`grid grid-cols-[12px_140px_1fr_120px] items-center px-4 py-2.5 gap-4 transition-opacity duration-300 ${
                    i > 0 ? "border-t border-subtle" : ""
                  } ${row.mine ? "bg-surface-2" : ""}`}
                  style={{ opacity: 1 - i * 0.04 }}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full inline-block ${
                      row.side === "YES" ? "bg-yes" : "bg-no"
                    }`}
                  />
                  <span className="font-mono text-xs text-fg-2">
                    {row.addr}
                    {row.mine && (
                      <span className="text-primary text-[10px] ml-1">
                        you
                      </span>
                    )}
                  </span>
                  <span className="font-mono text-[11px] text-fg-3 tracking-wider">
                    encrypted
                  </span>
                  <span className="font-mono text-[11px] text-fg-3 text-right">
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
        <aside className="sticky top-[72px]">
          {/* ── Resolved outcome card ────────────────────────────── */}
          {isMarketResolved && (
            <GlowCard className="p-6 mb-4">
              <div className="font-mono text-[10px] text-fg-3 tracking-[0.16em] uppercase mb-3">
                Resolved
              </div>
              <div className="text-center py-3">
                <div
                  className={`font-display text-[32px] font-medium ${
                    resolvedLabel === "YES"
                      ? "text-yes"
                      : resolvedLabel === "NO"
                        ? "text-no"
                        : "text-fg"
                  }`}
                >
                  {resolvedLabel}
                </div>

                {isConnected && hasPosition && !hasClaimed && (
                  <Button
                    variant="yes"
                    size="lg"
                    onClick={handleClaim}
                    disabled={claim.isWriting || claim.isConfirming}
                    className="w-full mt-5"
                  >
                    {claim.isWriting
                      ? "Submitting..."
                      : claim.isConfirming
                        ? "Confirming..."
                        : claim.isConfirmed
                          ? "Claimed"
                          : "Claim Winnings"}
                  </Button>
                )}

                {isConnected && hasClaimed && (
                  <div className="mt-4 flex justify-center gap-1.5 text-yes text-[13px]">
                    <Check className="w-3 h-3" /> Winnings claimed
                  </div>
                )}

                {isConnected && !hasPosition && (
                  <p className="mt-4 text-xs text-fg-4">
                    No position in this market.
                  </p>
                )}

                {claim.error && (
                  <p className="font-mono mt-3 text-[11px] text-no break-all">
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
                <div className="border border-subtle rounded p-5 mb-4">
                  <div className="font-mono text-[10px] text-fg-3 tracking-[0.16em] uppercase mb-3.5">
                    Dispute window
                  </div>
                  {isDisputed ? (
                    <div className="text-center py-2">
                      <p className="text-[13px] text-no font-medium mb-1">
                        This market has been disputed
                      </p>
                      <p className="text-xs text-fg-3">
                        Resolution is under review by the oracle.
                      </p>
                    </div>
                  ) : windowOpen ? (
                    <div>
                      <div className="flex justify-between mb-3 text-[13px]">
                        <span className="text-fg-3">
                          Blocks remaining
                        </span>
                        <span className="font-mono text-fg font-semibold">
                          {blocksRemaining!.toLocaleString()}
                        </span>
                      </div>
                      <div className="w-full h-1 bg-surface-3 rounded-sm mb-3.5 overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-sm transition-[width] duration-300 ease-out"
                          style={{
                            width: `${Math.max(0, Math.min(100, ((Number(window) - blocksRemaining!) / Number(window)) * 100))}%`,
                          }}
                        />
                      </div>
                      {isConnected && (
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={handleRaiseDispute}
                          disabled={isDisputeWriting || isDisputeConfirming}
                        >
                          {isDisputeWriting
                            ? "Confirm in wallet..."
                            : isDisputeConfirming
                              ? "Confirming..."
                              : "Raise Dispute"}
                        </Button>
                      )}
                      {(disputeWriteError || disputeConfirmError) && (
                        <p className="font-mono text-[11px] text-no mt-2 break-all">
                          {(disputeWriteError || disputeConfirmError)?.message}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-2">
                      <p className="text-[13px] text-fg-3">
                        Dispute window closed
                      </p>
                    </div>
                  )}
                </div>
              );
            })()}

          {/* ── Betting panel ─────────────────────────────────────── */}
          {!isMarketResolved && (
            <GlowCard className="p-6">
              {/* Not connected */}
              {!isConnected && (
                <p className="text-center py-8 text-fg-4 text-[13px]">
                  Connect wallet to place bets.
                </p>
              )}

              {/* Cancelled */}
              {isConnected && isMarketCancelled && (
                <p className="text-center py-6 text-fg-4 text-[13px]">
                  This market has been cancelled.
                </p>
              )}

              {/* Expired / Resolving */}
              {isConnected &&
                !isMarketOpen &&
                !isMarketCancelled && (
                  <div className="text-center py-6 text-fg-4 text-[13px]">
                    <p>
                      Market is{" "}
                      <strong className="text-fg-2">
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
                  <div className="grid grid-cols-2 gap-2 mb-5">
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
                  <div className="mb-1.5">
                    <div className="font-mono text-[10px] text-fg-3 tracking-[0.16em] uppercase mb-2">
                      Amount
                    </div>
                    <div
                      className={`flex items-center rounded border px-3.5 py-2.5 bg-background ${
                        isAmountBelowMin ? "border-no" : "border-strong"
                      }`}
                    >
                      <input
                        className="font-mono flex-1 text-2xl text-fg tracking-tight bg-transparent border-none outline-none"
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
                      />
                      <span className="font-mono text-xs text-fg-3 shrink-0">
                        cUSDT
                      </span>
                    </div>
                    {isAmountBelowMin && (
                      <p className="text-[11px] text-no mt-1">
                        Minimum bet is {minimumBetCUSDT} cUSDT
                      </p>
                    )}
                  </div>

                  {/* Quick fill chips */}
                  <div className="flex gap-1.5 mt-2.5">
                    {quickAmounts.map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => {
                          setAmount(String(v));
                          if (betStep !== "idle")
                            setBetStep("idle");
                        }}
                        className={`font-mono flex-1 py-[7px] text-[11px] border rounded-sm cursor-pointer transition-colors ${
                          amount === String(v)
                            ? "text-fg bg-surface-2 border-strong"
                            : "text-fg-2 bg-transparent border-subtle hover:border-strong"
                        }`}
                      >
                        {v}
                      </button>
                    ))}
                  </div>

                  {/* Payout preview */}
                  <div className="mt-5 p-3.5 bg-background border border-subtle rounded">
                    <div className="font-mono text-[10px] text-fg-3 tracking-[0.16em] uppercase mb-1.5">
                      If correct
                    </div>
                    <div className="font-mono text-base text-fg">
                      {payout.toFixed(2)}{" "}
                      <span className="text-fg-3 text-xs">
                        cUSDT
                      </span>
                      <span
                        className={`ml-2.5 text-[13px] ${
                          profit >= 0 ? "text-yes" : "text-no"
                        }`}
                      >
                        {profit >= 0 ? "+" : ""}
                        {profit.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Submit button */}
                  <Button
                    variant={side === "YES" ? "yes" : "no"}
                    size="lg"
                    onClick={handlePlaceBet}
                    disabled={
                      betStep !== "idle" ||
                      amountNum <= 0 ||
                      isAmountBelowMin ||
                      isBetWriting ||
                      isBetConfirming
                    }
                    className="w-full mt-4 font-medium tracking-wide"
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
                  </Button>

                  {/* Fee/min info */}
                  <div className="font-mono mt-3.5 text-[10px] text-fg-3 text-center tracking-wider uppercase">
                    Fee 0% &middot; Min{" "}
                    {minimumBetCUSDT > 0
                      ? minimumBetCUSDT
                      : "--"}{" "}
                    cUSDT
                  </div>

                  {/* Error state */}
                  {betStep === "error" && (
                    <div className="mt-3 p-3.5 border border-no rounded text-xs">
                      <p className="text-no font-medium mb-1.5 flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        {fhe.error ||
                          bet.error?.message ||
                          "Something went wrong"}
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setBetStep("idle");
                          fhe.reset();
                        }}
                      >
                        Retry
                      </Button>
                    </div>
                  )}

                  {bet.error && betStep !== "error" && (
                    <div className="mt-3 p-3.5 border border-no rounded">
                      <p className="font-mono text-[11px] text-no break-all">
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
