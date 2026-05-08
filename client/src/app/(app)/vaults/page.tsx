"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import { useAccount, useReadContract, useReadContracts, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { vaultFactoryConfig, getVaultConfig } from "@/lib/contracts";
import { useApproveCUSDT } from "@/hooks/useCUSDT";
import { useFHEEncrypt } from "@/hooks/useFHEVM";
import { CONTRACT_ADDRESSES } from "@/constants/addresses";
import { GlowCard } from "@/components/nc/GlowCard";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/nc/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, RefreshCw, ArrowRight, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

type DepositStep = "idle" | "encrypting" | "approving" | "writing" | "confirming" | "confirmed" | "error";

function truncAddr(addr: string): string {
  if (addr.length <= 10) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function fmtUSD(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(1)}k`;
  return `$${v.toFixed(2)}`;
}

function VaultCard({ address }: { address: `0x${string}` }) {
  const config = getVaultConfig(address);
  const { address: userAddress } = useAccount();

  const { data, isLoading } = useReadContracts({
    contracts: [
      { ...config, functionName: "name" },
      { ...config, functionName: "description" },
      { ...config, functionName: "manager" },
      { ...config, functionName: "followerCount" },
      { ...config, functionName: "requiredTier" },
      { ...config, functionName: "performanceFeeBps" },
      { ...config, functionName: "publicTotalDeposits" },
      { ...config, functionName: "closed" },
      { ...config, functionName: "vaultId" },
    ],
  });

  const name = data?.[0]?.result as string | undefined;
  const manager = data?.[2]?.result as string | undefined;
  const followerCount = data?.[3]?.result as bigint | undefined;
  const perfFeeBps = data?.[5]?.result as number | undefined;
  const publicTotalDeposits = data?.[6]?.result as bigint | undefined;
  const closed = data?.[7]?.result as boolean | undefined;

  const isManager = userAddress && manager && userAddress.toLowerCase() === manager.toLowerCase();

  const { writeContract: writeClose, data: closeHash, isPending: isClosing } = useWriteContract();
  const { isLoading: isCloseConfirming, isSuccess: isCloseClosed } = useWaitForTransactionReceipt({ hash: closeHash });

  const handleClose = () => { writeClose({ ...config, functionName: "closeVault" }); };

  const { writeContract: writeDeposit, data: depositHash, isPending: isDepositWriting, error: depositWriteError } = useWriteContract();
  const { isLoading: isDepositConfirming, isSuccess: isDepositConfirmed } = useWaitForTransactionReceipt({ hash: depositHash });

  const approveCUSDT = useApproveCUSDT();
  const fhe = useFHEEncrypt();

  const [amount, setAmount] = useState("100");
  const [depositStep, setDepositStep] = useState<DepositStep>("idle");
  const [showDeposit, setShowDeposit] = useState(false);
  const amountNum = parseFloat(amount) || 0;

  const prevConfirmed = useRef(false);
  useEffect(() => {
    if (isDepositConfirmed && !prevConfirmed.current && depositStep === "confirming") {
      prevConfirmed.current = true;
      setDepositStep("confirmed");
    }
    if (!isDepositConfirmed) prevConfirmed.current = false;
  }, [isDepositConfirmed, depositStep]);

  const handleDeposit = useCallback(async () => {
    if (!userAddress || amountNum <= 0) return;
    try {
      setDepositStep("encrypting");
      const amountBaseUnits = BigInt(Math.round(amountNum * 1e6));
      const encResult = await fhe.encrypt(amountBaseUnits, address);
      if (!encResult) { setDepositStep("error"); return; }
      setDepositStep("approving");
      const approveEnc = await fhe.encrypt(amountBaseUnits, CONTRACT_ADDRESSES.MockcUSDT as `0x${string}`);
      if (!approveEnc) { setDepositStep("error"); return; }
      approveCUSDT.approve(address, approveEnc.handle, approveEnc.inputProof);
      setDepositStep("writing");
      writeDeposit({ ...config, functionName: "deposit", args: [encResult.handle, encResult.inputProof] });
      setDepositStep("confirming");
    } catch { setDepositStep("error"); }
  }, [userAddress, amountNum, address, fhe, approveCUSDT, writeDeposit, config]);

  if (isLoading) {
    return (
      <GlowCard className="p-6 space-y-4">
        <Skeleton className="h-5 w-1/2" />
        <Skeleton className="h-3 w-2/3" />
        <Skeleton className="h-9 w-full" />
      </GlowCard>
    );
  }

  const isClosed = closed || isCloseClosed;
  const followers = followerCount ? Number(followerCount) : 0;
  const aum = publicTotalDeposits ? Number(publicTotalDeposits) / 1e6 : 0;
  const feePercent = perfFeeBps !== undefined ? (perfFeeBps / 100) : 0;
  const rep = Math.min(followers * 10 + 20, 99);
  const C = 2 * Math.PI * 9;

  return (
    <GlowCard className="p-6">
      {/* Top: name + manager + rep ring */}
      <div className="flex justify-between items-start mb-5">
        <div>
          <div className="font-display text-xl font-medium tracking-tight">{name || "Unnamed Vault"}</div>
          <div className="font-mono text-[11px] text-fg-3 mt-1">by {manager ? truncAddr(manager) : "--"}</div>
        </div>
        <div className="relative w-7 h-7">
          <svg width="28" height="28" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="9" fill="none" stroke="hsl(var(--border) / 0.08)" strokeWidth="1.5" />
            <circle cx="12" cy="12" r="9" fill="none" stroke="hsl(var(--primary))" strokeWidth="1.5"
              strokeDasharray={`${C * rep / 100} ${C}`} transform="rotate(-90 12 12)" strokeLinecap="round" />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center font-mono text-[9px] text-primary">{rep}</span>
        </div>
      </div>

      {/* Stats row */}
      <div className="font-mono flex gap-4 text-[11px] text-fg-3 mb-5">
        <span><span className="text-fg">{followers}</span> followers</span>
        <span className="text-fg-4">·</span>
        <span><span className="text-fg">{aum > 0 ? fmtUSD(aum) : "Pending sync"}</span> deposited</span>
        <span className="text-fg-4">·</span>
        <span className={isClosed ? "text-no" : "text-yes"}>{isClosed ? "Closed" : "Active"}</span>
      </div>

      {/* Fee bar */}
      <div className="mb-5">
        <div className="h-1.5 rounded-sm bg-surface-3 overflow-hidden">
          <div className="h-full bg-gradient-to-r from-primary/60 to-primary" style={{ width: `${Math.min(feePercent * 4, 100)}%` }} />
        </div>
        <div className="font-mono text-[10px] text-fg-3 mt-1.5 tracking-wider">{feePercent}% performance fee</div>
      </div>

      {/* Action buttons */}
      {!isClosed && !showDeposit && (
        <div className="flex gap-2">
          <Button variant="primary" className="flex-1" onClick={() => setShowDeposit(true)}>Deposit</Button>
          {isManager ? (
            <Button variant="outline" onClick={handleClose} disabled={isClosing || isCloseConfirming}>
              {isClosing ? "Confirm..." : isCloseConfirming ? "Closing..." : "Close"}
            </Button>
          ) : (
            <Button variant="outline" asChild>
              <Link href="/vaults">Details <ArrowRight className="w-3 h-3" /></Link>
            </Button>
          )}
        </div>
      )}

      {/* Deposit form */}
      {!isClosed && showDeposit && (
        <div>
          <div className="mb-3">
            <label className="font-mono text-[10px] tracking-[0.12em] uppercase text-fg-3 block mb-1.5">Deposit amount</label>
            <div className="flex border border-subtle rounded overflow-hidden">
              <input type="text" placeholder="0.00" value={amount}
                onChange={(e) => { setAmount(e.target.value); if (depositStep !== "idle") setDepositStep("idle"); }}
                className="font-mono flex-1 px-3 py-2 text-sm bg-transparent border-none text-fg outline-none" />
              <span className="font-mono px-3 py-2 text-[11px] text-fg-3 flex items-center">cUSDT</span>
            </div>
          </div>
          <div className="flex gap-1.5 mb-3">
            {[50, 100, 250, 500].map((qa) => (
              <button key={qa} onClick={() => { setAmount(String(qa)); if (depositStep !== "idle") setDepositStep("idle"); }}
                className={`font-mono flex-1 py-1.5 text-[11px] border rounded-sm transition-colors ${
                  amount === String(qa) ? "border-primary/40 text-primary" : "border-subtle text-fg-3 hover:border-strong"
                }`}>{qa}</button>
            ))}
          </div>
          <Button variant="primary" className="w-full" onClick={handleDeposit}
            disabled={!userAddress || depositStep !== "idle" || amountNum <= 0 || isDepositWriting || isDepositConfirming}>
            {!userAddress ? "Connect wallet"
              : depositStep === "encrypting" ? "Encrypting..."
              : depositStep === "approving" ? "Approving cUSDT..."
              : depositStep === "writing" || isDepositWriting ? "Confirm in wallet..."
              : isDepositConfirming ? "Confirming..."
              : depositStep === "confirmed" ? "Deposited"
              : `Deposit ${amountNum > 0 ? `${amountNum} cUSDT` : ""}`}
          </Button>
          {depositStep === "error" && (
            <div className="mt-2.5 p-3 border border-no rounded text-xs">
              <p className="text-no flex items-center gap-1.5 mb-1.5">
                <AlertTriangle className="w-3 h-3" />
                {fhe.error || depositWriteError?.message || "Something went wrong"}
              </p>
              <Button variant="outline" size="sm" onClick={() => { setDepositStep("idle"); fhe.reset(); }}>Retry</Button>
            </div>
          )}
        </div>
      )}

      {isClosed && (
        <div className="font-mono text-[11px] text-fg-4 text-center py-2">Vault closed</div>
      )}
    </GlowCard>
  );
}

export default function VaultsPage() {
  const { data: allVaults, isLoading } = useReadContract({ ...vaultFactoryConfig, functionName: "getAllVaults" });
  const vaults = (allVaults as `0x${string}`[]) || [];
  const [syncing, setSyncing] = useState(false);

  const handleSync = () => {
    setSyncing(true);
    fetch("/api/keeper")
      .then((r) => r.json())
      .then((data) => {
        const vaultUpdates = data.vaults?.filter((v: { action: string }) => v.action.includes("shares=")).length ?? 0;
        if (vaultUpdates > 0) {
          toast.success(`Synced ${vaultUpdates} vault${vaultUpdates > 1 ? "s" : ""}`);
        } else {
          toast.info("Nothing to sync — vaults are up to date");
        }
      })
      .catch(() => toast.error("Sync failed — check server logs"))
      .finally(() => setSyncing(false));
  };

  return (
    <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-8 sm:py-10 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-2">
        <div>
          <span className="section-numeral text-xl sm:text-2xl">§ Vaults</span>
          <h1 className="font-display text-3xl sm:text-4xl text-fg mt-1">Strategy vaults</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/vaults/create"><Plus className="w-3 h-3" /> Create vault</Link>
          </Button>
          <Button variant="outline" size="sm" onClick={handleSync} disabled={syncing}>
            <RefreshCw className={`w-3 h-3 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? "Syncing..." : "Sync totals"}
          </Button>
        </div>
      </div>

      <p className="text-fg-3 text-sm mb-8 max-w-xl font-display">
        Follow a manager&apos;s strategy. Your deposits mirror their positions &mdash; without you or them seeing each other&apos;s sizes.
      </p>

      {isLoading && (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="card-etched p-6 space-y-4">
              <Skeleton className="h-5 w-1/2" />
              <Skeleton className="h-3 w-2/3" />
              <Skeleton className="h-9 w-full" />
            </div>
          ))}
        </div>
      )}

      {!isLoading && vaults.length > 0 && (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {vaults.map((addr) => <VaultCard key={addr} address={addr} />)}
        </div>
      )}

      {!isLoading && vaults.length === 0 && (
        <EmptyState title="No vaults yet" body="Create the first strategy vault and let others follow your edge." />
      )}
    </div>
  );
}
