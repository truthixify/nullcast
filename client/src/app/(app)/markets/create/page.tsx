"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAccount, useBlockNumber } from "wagmi";
import { stringToHex } from "viem";
import { useCreateMarket } from "@/hooks/useFactory";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Check, ExternalLink, Loader2 } from "lucide-react";

const CATEGORY_OPTIONS = ["CRYPTO", "MACRO", "EQUITY", "SPORTS", "TECH", "OTHER"] as const;
const SEPOLIA_BLOCK_TIME_SECONDS = 12;

function TypeTile({ title, sub, active, disabled, onClick }: {
  title: string; sub: string; active: boolean; disabled: boolean; onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick} disabled={disabled}
      className={`flex-1 p-4 text-left rounded border transition-colors ${
        active ? "bg-primary/[0.08] border-primary/40" : "border-subtle hover:border-strong"
      } ${disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}>
      <div className={`font-display text-base font-medium mb-1 ${active ? "text-primary" : "text-fg"}`}>{title}</div>
      <div className="text-xs text-fg-3">{sub}</div>
    </button>
  );
}

export default function CreateMarketPage() {
  const router = useRouter();
  const { isConnected } = useAccount();
  const { data: currentBlock } = useBlockNumber();
  const { createMarket, hash, isWriting, isConfirming, isConfirmed, error } = useCreateMarket();

  const [question, setQuestion] = useState("");
  const [expiry, setExpiry] = useState("");
  const [minimumBet, setMinimumBet] = useState("1");
  const [marketType, setMarketType] = useState<"binary" | "scalar">("binary");
  const [bucketCount, setBucketCount] = useState("3");
  const [category, setCategory] = useState<typeof CATEGORY_OPTIONS[number]>("CRYPTO");

  const expiryBlock = useMemo(() => {
    if (!expiry || !currentBlock) return undefined;
    const targetDate = new Date(expiry + "T23:59:59Z");
    const diffSeconds = Math.floor((targetDate.getTime() - Date.now()) / 1000);
    if (diffSeconds <= 0) return undefined;
    return currentBlock + BigInt(Math.ceil(diffSeconds / SEPOLIA_BLOCK_TIME_SECONDS));
  }, [expiry, currentBlock]);

  const minimumBetInBaseUnits = useMemo(() => {
    const parsed = parseFloat(minimumBet);
    if (isNaN(parsed) || parsed <= 0) return undefined;
    return BigInt(Math.floor(parsed * 1e6));
  }, [minimumBet]);

  const isFormValid = question.trim().length > 0 && !!expiryBlock && !!minimumBetInBaseUnits &&
    (marketType === "binary" || (marketType === "scalar" && parseInt(bucketCount) >= 2));

  const handleSubmit = () => {
    if (!isFormValid || !expiryBlock || !minimumBetInBaseUnits) return;
    const buckets = marketType === "scalar" ? parseInt(bucketCount) : 0;
    createMarket(question.trim(), expiryBlock, minimumBetInBaseUnits, buckets, stringToHex(category, { size: 32 }));
  };

  if (isConfirmed) setTimeout(() => router.push("/markets"), 2000);

  const txState = isConfirmed ? "confirmed" : isConfirming ? "confirming" : isWriting ? "writing" : "idle";

  return (
    <div className="max-w-[720px] mx-auto px-4 sm:px-6 py-8 sm:py-10 animate-fade-in">
      <Link href="/markets" className="inline-flex items-center gap-1.5 text-xs text-fg-3 hover:text-fg-2 transition-colors mb-6">
        <ArrowLeft className="w-3 h-3" /> All markets
      </Link>

      <div className="mb-8">
        <span className="section-numeral text-xl">§ Create</span>
        <h1 className="font-display text-3xl sm:text-4xl text-fg mt-1">New market</h1>
      </div>

      <div className="space-y-6">
        {/* Question */}
        <div>
          <label className="font-mono text-[10px] tracking-[0.12em] uppercase text-fg-3 block mb-1.5">Market question *</label>
          <input type="text" placeholder="Will [event] happen by [date]?" value={question}
            onChange={(e) => setQuestion(e.target.value)} disabled={txState !== "idle"}
            className="w-full px-3 py-2.5 text-sm bg-transparent border border-subtle rounded text-fg outline-none focus:border-strong transition-colors" />
          <span className="font-mono text-[10px] text-fg-4 mt-1 block">Write a clear yes/no question. Ambiguous questions may be disputed.</span>
        </div>

        {/* Market type */}
        <div>
          <label className="font-mono text-[10px] tracking-[0.12em] uppercase text-fg-3 block mb-1.5">Market type</label>
          <div className="flex gap-2">
            <TypeTile title="Binary" sub="Yes or No outcome" active={marketType === "binary"} disabled={txState !== "idle"} onClick={() => setMarketType("binary")} />
            <TypeTile title="Scalar" sub="Multiple outcome buckets" active={marketType === "scalar"} disabled={txState !== "idle"} onClick={() => setMarketType("scalar")} />
          </div>
        </div>

        {/* Category */}
        <div>
          <label className="font-mono text-[10px] tracking-[0.12em] uppercase text-fg-3 block mb-1.5">Category</label>
          <div className="flex gap-1.5 flex-wrap">
            {CATEGORY_OPTIONS.map((cat) => (
              <button key={cat} type="button" onClick={() => setCategory(cat)} disabled={txState !== "idle"}
                className={`font-mono px-3.5 py-1.5 text-[11px] border rounded-sm transition-colors ${
                  category === cat ? "border-primary/40 text-primary bg-primary/[0.08]" : "border-subtle text-fg-3 hover:border-strong"
                }`}>{cat}</button>
            ))}
          </div>
        </div>

        {/* Scalar bucket count */}
        {marketType === "scalar" && (
          <div>
            <label className="font-mono text-[10px] tracking-[0.12em] uppercase text-fg-3 block mb-1.5">Bucket count</label>
            <input type="number" value={bucketCount} onChange={(e) => setBucketCount(e.target.value)}
              disabled={txState !== "idle"} min="2" max="10" step="1" placeholder="3"
              className="w-[120px] px-3 py-2.5 text-sm bg-transparent border border-subtle rounded text-fg outline-none font-mono" />
            <span className="font-mono text-[10px] text-fg-4 mt-1 block">Number of outcome buckets (2-10)</span>
          </div>
        )}

        {/* Expiry + Min bet */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="font-mono text-[10px] tracking-[0.12em] uppercase text-fg-3 block mb-1.5">Expiry date</label>
            <input type="date" value={expiry} onChange={(e) => setExpiry(e.target.value)}
              disabled={txState !== "idle"} min={new Date().toISOString().split("T")[0]}
              className="w-full px-3 py-2.5 text-sm bg-transparent border border-subtle rounded text-fg outline-none [color-scheme:dark]" />
            {expiryBlock && <span className="font-mono text-[10px] text-fg-4 mt-1 block">Block #{expiryBlock.toString()}</span>}
          </div>
          <div>
            <label className="font-mono text-[10px] tracking-[0.12em] uppercase text-fg-3 block mb-1.5">Minimum bet</label>
            <div className="flex border border-subtle rounded overflow-hidden">
              <input type="number" value={minimumBet} onChange={(e) => setMinimumBet(e.target.value)}
                disabled={txState !== "idle"} min="0.01" step="0.01" placeholder="1"
                className="font-mono flex-1 px-3 py-2.5 text-sm bg-transparent border-none text-fg outline-none" />
              <span className="font-mono px-3 py-2.5 text-[11px] text-fg-3 flex items-center">cUSDT</span>
            </div>
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
                <span className="text-yes font-medium">Market created</span>
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
          <Link href="/markets" className="text-[13px] text-fg-3 hover:text-fg-2 transition-colors">Cancel</Link>
          <Button variant="primary" onClick={handleSubmit} disabled={!isConnected || !isFormValid || txState !== "idle"}>
            {!isConnected ? "Connect wallet to deploy" : txState === "idle" ? "Create Market" : "Processing..."}
          </Button>
        </div>
      </div>
    </div>
  );
}
