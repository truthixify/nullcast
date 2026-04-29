"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { vaultFactoryConfig } from "@/lib/contracts";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Check, ExternalLink, Loader2 } from "lucide-react";

const TIER_OPTIONS = [
  { value: 0, label: "Open -- anyone can deposit" },
  { value: 20, label: "Explorer+ (score >= 20)" },
  { value: 40, label: "Analyst+ (score >= 40)" },
  { value: 60, label: "Strategist+ (score >= 60)" },
  { value: 80, label: "Oracle+ (score >= 80)" },
] as const;

export default function CreateVaultPage() {
  const router = useRouter();
  const { isConnected } = useAccount();
  const { writeContract, data: hash, isPending: isWriting, error: writeError } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed, error: confirmError } = useWaitForTransactionReceipt({ hash });

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [requiredTier, setRequiredTier] = useState(20);
  const [performanceFee, setPerformanceFee] = useState("1000");

  const perfFeeNum = parseInt(performanceFee) || 0;
  const isFormValid = name.trim().length > 0 && perfFeeNum >= 0 && perfFeeNum <= 10000;

  const handleSubmit = () => {
    if (!isFormValid) return;
    writeContract({ ...vaultFactoryConfig, functionName: "createVault", args: [name.trim(), description.trim(), requiredTier, perfFeeNum] });
  };

  if (isConfirmed) setTimeout(() => router.push("/vaults"), 2000);

  const error = writeError || confirmError;
  const txState = isConfirmed ? "confirmed" : isConfirming ? "confirming" : isWriting ? "writing" : "idle";

  return (
    <div className="max-w-[720px] mx-auto px-4 sm:px-6 py-8 sm:py-10 animate-fade-in">
      <Link href="/vaults" className="inline-flex items-center gap-1.5 text-xs text-fg-3 hover:text-fg-2 transition-colors mb-6">
        <ArrowLeft className="w-3 h-3" /> All vaults
      </Link>

      <div className="mb-8">
        <span className="section-numeral text-xl">§ Create</span>
        <h1 className="font-display text-3xl sm:text-4xl text-fg mt-1">New vault</h1>
      </div>

      <div className="space-y-6">
        <div>
          <label className="font-mono text-[10px] tracking-[0.12em] uppercase text-fg-3 block mb-1.5">Vault name *</label>
          <input type="text" placeholder="Alpha Predictions Fund" value={name}
            onChange={(e) => setName(e.target.value)} disabled={txState !== "idle"}
            className="w-full px-3 py-2.5 text-sm bg-transparent border border-subtle rounded text-fg outline-none focus:border-strong transition-colors" />
          <span className="font-mono text-[10px] text-fg-4 mt-1 block">A descriptive name for your strategy vault.</span>
        </div>

        <div>
          <label className="font-mono text-[10px] tracking-[0.12em] uppercase text-fg-3 block mb-1.5">Description</label>
          <textarea placeholder="Describe your trading strategy..." value={description}
            onChange={(e) => setDescription(e.target.value)} disabled={txState !== "idle"} rows={3}
            className="w-full px-3 py-2.5 text-sm bg-transparent border border-subtle rounded text-fg outline-none resize-y min-h-[80px] focus:border-strong transition-colors" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="font-mono text-[10px] tracking-[0.12em] uppercase text-fg-3 block mb-1.5">Required reputation tier</label>
            <select value={requiredTier} onChange={(e) => setRequiredTier(parseInt(e.target.value))} disabled={txState !== "idle"}
              className="w-full px-3 py-2.5 text-sm bg-transparent border border-subtle rounded text-fg outline-none [color-scheme:dark]">
              {TIER_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
            <span className="font-mono text-[10px] text-fg-4 mt-1 block">Minimum reputation to deposit</span>
          </div>
          <div>
            <label className="font-mono text-[10px] tracking-[0.12em] uppercase text-fg-3 block mb-1.5">Performance fee (basis points)</label>
            <div className="flex border border-subtle rounded overflow-hidden">
              <input type="number" value={performanceFee} onChange={(e) => setPerformanceFee(e.target.value)}
                disabled={txState !== "idle"} min="0" max="10000" step="100" placeholder="1000"
                className="font-mono flex-1 px-3 py-2.5 text-sm bg-transparent border-none text-fg outline-none" />
              <span className="font-mono px-3 py-2.5 text-[11px] text-fg-3 flex items-center">bps</span>
            </div>
            <span className="font-mono text-[10px] text-fg-4 mt-1 block">1000 bps = 10%. Max 10000 bps (100%).</span>
          </div>
        </div>

        <div className="border-b border-subtle" />

        {error && (
          <div className="p-3 border border-no rounded text-[13px] text-no">
            {error.message?.includes("User rejected") ? "Transaction rejected by user." : error.message ?? "Transaction failed."}
          </div>
        )}

        {txState !== "idle" && (
          <div className="flex items-center gap-2 text-[13px]">
            {txState === "confirmed" ? (
              <>
                <Check className="w-3.5 h-3.5 text-yes" />
                <span className="text-yes font-medium">Vault created</span>
                {hash && (
                  <a href={`https://sepolia.etherscan.io/tx/${hash}`} target="_blank" rel="noopener noreferrer"
                    className="font-mono text-primary text-xs flex items-center gap-1">
                    Etherscan <ExternalLink className="w-3 h-3" />
                  </a>
                )}
                <span className="font-mono text-fg-3 text-xs">Redirecting...</span>
              </>
            ) : (
              <>
                <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />
                <span className="text-fg-2">{txState === "writing" ? "Confirm in wallet..." : "Waiting for confirmation..."}</span>
              </>
            )}
          </div>
        )}

        <div className="flex justify-between items-center">
          <Link href="/vaults" className="text-[13px] text-fg-3 hover:text-fg-2 transition-colors">Cancel</Link>
          <Button variant="primary" onClick={handleSubmit} disabled={!isConnected || !isFormValid || txState !== "idle"}>
            {!isConnected ? "Connect wallet to deploy" : txState === "idle" ? "Create Vault" : "Processing..."}
          </Button>
        </div>
      </div>
    </div>
  );
}
