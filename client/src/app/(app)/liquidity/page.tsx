"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useAccount, useReadContract } from "wagmi";
import { useFactoryMarkets } from "@/hooks/useFactory";
import { useMarket } from "@/hooks/useMarket";
import { useLiquidityPool, useIsLP, useAddLiquidity, useWithdrawLiquidity, useClaimLPFees } from "@/hooks/useLiquidity";
import { useApproveCUSDT } from "@/hooks/useCUSDT";
import { useFHEEncrypt } from "@/hooks/useFHEVM";
import { useSignTypedData } from "wagmi";
import { getRelayer } from "@/lib/fhevm";
import { nullCastFactoryConfig } from "@/lib/contracts";
import { CONTRACT_ADDRESSES } from "@/constants/addresses";
import LiquidityPoolABI from "@/constants/abis/LiquidityPool.json";
import { GlowCard } from "@/components/nc/GlowCard";
import { RevealNumber } from "@/components/nc/RevealNumber";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/nc/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshCw, AlertTriangle, Eye } from "lucide-react";

type DepositStep = "idle" | "encrypting" | "approving" | "writing" | "confirming" | "confirmed" | "error";

function fmtUSD(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(1)}k`;
  return `$${v.toFixed(2)}`;
}

function MarketLPCard({ marketAddress, marketIndex }: { marketAddress: `0x${string}`; marketIndex: number }) {
  const { address: userAddress } = useAccount();
  const { question, isLoading: isMarketLoading } = useMarket(marketAddress);

  const { data: poolAddressRaw, isLoading: isPoolAddrLoading } = useReadContract({
    ...nullCastFactoryConfig, functionName: "getLiquidityPool", args: [BigInt(marketIndex)],
  });

  const poolAddress = poolAddressRaw as `0x${string}` | undefined;
  const isZeroPool = !poolAddress || poolAddress === "0x0000000000000000000000000000000000000000";
  const zeroAddr = "0x0000000000000000000000000000000000000000" as `0x${string}`;

  const { totalLiquidity } = useLiquidityPool(isZeroPool ? zeroAddr : poolAddress);
  const { isLP } = useIsLP(isZeroPool ? zeroAddr : poolAddress, userAddress);

  const addLiq = useAddLiquidity(isZeroPool ? zeroAddr : poolAddress);
  const withdrawLiq = useWithdrawLiquidity(isZeroPool ? zeroAddr : poolAddress);
  const claimFees = useClaimLPFees(isZeroPool ? zeroAddr : poolAddress);
  const approveCUSDT = useApproveCUSDT();
  const fhe = useFHEEncrypt();

  const { signTypedDataAsync } = useSignTypedData();
  const [shareDecrypted, setShareDecrypted] = useState<string | null>(null);
  const [isDecrypting, setIsDecrypting] = useState(false);

  const { data: shareHandle } = useReadContract({
    address: isZeroPool ? zeroAddr : poolAddress,
    abi: LiquidityPoolABI, functionName: "getLPShares",
    args: userAddress ? [userAddress] : undefined,
    query: { enabled: !!userAddress && isLP === true },
  });

  const handleDecryptShare = useCallback(async () => {
    if (!userAddress || !poolAddress || !shareHandle) return;
    const handleHex = shareHandle as `0x${string}`;
    if (handleHex === zeroAddr + "0".repeat(24)) return;
    setIsDecrypting(true);
    try {
      const relayer = await getRelayer();
      const keypair = await relayer.generateKeypair();
      const startTimestamp = Math.floor(Date.now() / 1000);
      const eip712 = await relayer.createEIP712(keypair.publicKey, [poolAddress], startTimestamp, 1);
      const primaryType = eip712.primaryType || Object.keys(eip712.types).find((k: string) => k !== "EIP712Domain") || "UserDecryptRequestVerification";
      const signature = await signTypedDataAsync({
        types: eip712.types as Record<string, Array<{ name: string; type: string }>>,
        primaryType, domain: eip712.domain as { name: string; version: string; chainId: number; verifyingContract: `0x${string}` },
        message: eip712.message as Record<string, unknown>,
      });
      const result = await relayer.userDecrypt({
        handles: [handleHex], contractAddress: poolAddress, signedContractAddresses: [poolAddress],
        privateKey: keypair.privateKey, publicKey: keypair.publicKey, signature, signerAddress: userAddress,
        startTimestamp, durationDays: 1,
      });
      const val = result[handleHex] as bigint;
      setShareDecrypted((Number(val) / 1e6).toFixed(2));
    } catch { /* User rejected or KMS error */ }
    finally { setIsDecrypting(false); }
  }, [userAddress, poolAddress, shareHandle, signTypedDataAsync]);

  const [amount, setAmount] = useState("100");
  const [depositStep, setDepositStep] = useState<DepositStep>("idle");
  const [showDepositForm, setShowDepositForm] = useState(false);
  const amountNum = parseFloat(amount) || 0;

  const prevConfirmed = useRef(false);
  useEffect(() => {
    if (addLiq.isConfirmed && !prevConfirmed.current && depositStep === "confirming") {
      prevConfirmed.current = true; setDepositStep("confirmed");
    }
    if (!addLiq.isConfirmed) prevConfirmed.current = false;
  }, [addLiq.isConfirmed, depositStep]);

  const handleDeposit = useCallback(async () => {
    if (!userAddress || isZeroPool || !poolAddress || amountNum <= 0) return;
    try {
      setDepositStep("encrypting");
      const amountBaseUnits = BigInt(Math.round(amountNum * 1e6));
      const encResult = await fhe.encrypt(amountBaseUnits, poolAddress);
      if (!encResult) { setDepositStep("error"); return; }
      setDepositStep("approving");
      const approveEnc = await fhe.encrypt(amountBaseUnits, CONTRACT_ADDRESSES.MockcUSDT as `0x${string}`);
      if (!approveEnc) { setDepositStep("error"); return; }
      approveCUSDT.approve(poolAddress, approveEnc.handle, approveEnc.inputProof);
      setDepositStep("writing");
      addLiq.addLiquidity(encResult.handle, encResult.inputProof);
      setDepositStep("confirming");
    } catch { setDepositStep("error"); }
  }, [userAddress, isZeroPool, poolAddress, amountNum, fhe, approveCUSDT, addLiq]);

  if (isMarketLoading || isPoolAddrLoading) {
    return (
      <GlowCard className="p-6 space-y-4">
        <Skeleton className="h-5 w-3/5" />
        <Skeleton className="h-4 w-2/5" />
        <Skeleton className="h-9 w-full" />
      </GlowCard>
    );
  }

  if (isZeroPool) {
    return (
      <GlowCard className="p-6">
        <div className="font-display text-[17px] font-medium tracking-tight leading-snug text-fg mb-4">
          {question ?? "Unknown market"}
        </div>
        <div className="text-center text-fg-4 text-[13px] py-4">No liquidity pool deployed for this market.</div>
      </GlowCard>
    );
  }

  return (
    <GlowCard className="p-6">
      <div className="font-display text-[17px] font-medium tracking-tight leading-snug text-fg mb-5 cursor-pointer">
        {question ?? "Unknown market"}
      </div>

      <div className="grid grid-cols-2 gap-5 mb-5">
        <div>
          <div className="text-[9px] text-fg-4 tracking-[0.18em] uppercase mb-1.5">Your share</div>
          <div className="font-mono text-xl text-fg tracking-tight">
            {isLP ? (
              shareDecrypted ? (
                <><RevealNumber value={shareDecrypted} revealed={true} /> <span className="text-fg-3 text-[11px] ml-1.5">cUSDT</span></>
              ) : (
                <span className="flex items-center gap-2">
                  <span className="text-sm tracking-wider text-fg-3">••••••</span>
                  <Button variant="outline" size="sm" onClick={handleDecryptShare} disabled={isDecrypting}
                    className="text-primary border-primary/30 h-6 px-2.5 text-[11px]">
                    <Eye className="w-3 h-3" />
                    {isDecrypting ? "Decrypting..." : "Decrypt"}
                  </Button>
                </span>
              )
            ) : <span className="text-sm text-fg-3">&mdash;</span>}
          </div>
        </div>
        <div>
          <div className="text-[9px] text-fg-4 tracking-[0.18em] uppercase mb-1.5">Pool TVL</div>
          <div className="font-mono text-xl text-fg tracking-tight">{fmtUSD(totalLiquidity)}</div>
        </div>
      </div>

      {!showDepositForm ? (
        <div className="flex gap-2">
          <Button variant="primary" className="flex-1" onClick={() => setShowDepositForm(true)}>Deposit</Button>
          <Button variant="outline" className="flex-1" disabled={!isLP}
            onClick={() => { if (isLP) withdrawLiq.withdrawLiquidity(); }}>
            {withdrawLiq.isWriting ? "Confirm..." : withdrawLiq.isConfirming ? "Withdrawing..." : withdrawLiq.isConfirmed ? "Withdrawn" : "Withdraw"}
          </Button>
        </div>
      ) : (
        <div>
          <div className="mb-2.5">
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
            disabled={!userAddress || depositStep !== "idle" || amountNum <= 0 || addLiq.isWriting || addLiq.isConfirming}>
            {!userAddress ? "Connect wallet"
              : depositStep === "encrypting" ? "Encrypting..."
              : depositStep === "approving" ? "Approving cUSDT..."
              : depositStep === "writing" || addLiq.isWriting ? "Confirm in wallet..."
              : addLiq.isConfirming ? "Confirming..."
              : depositStep === "confirmed" ? "Deposited"
              : `Deposit ${amountNum > 0 ? `${amountNum} cUSDT` : ""}`}
          </Button>
          {depositStep === "error" && (
            <div className="mt-2.5 p-3 border border-no rounded text-xs">
              <p className="text-no flex items-center gap-1.5 mb-1.5">
                <AlertTriangle className="w-3 h-3" /> {fhe.error || addLiq.error?.message || "Something went wrong"}
              </p>
              <Button variant="outline" size="sm" onClick={() => { setDepositStep("idle"); fhe.reset(); }}>Retry</Button>
            </div>
          )}
        </div>
      )}

      {isLP && !showDepositForm && (
        <Button variant="outline" className="w-full mt-2 font-mono text-[11px]"
          onClick={() => claimFees.claimFees()} disabled={claimFees.isWriting || claimFees.isConfirming}>
          {claimFees.isWriting ? "Confirm..." : claimFees.isConfirming ? "Claiming..." : claimFees.isConfirmed ? "Fees claimed" : "Claim fees"}
        </Button>
      )}
    </GlowCard>
  );
}

export default function LiquidityPage() {
  const { allMarkets, isLoading } = useFactoryMarkets();
  const [syncing, setSyncing] = useState(false);

  const handleSync = async () => {
    setSyncing(true);
    try { await fetch("/api/keeper"); } catch { /* ignore */ }
    setSyncing(false);
  };

  return (
    <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-8 sm:py-10 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
        <div>
          <span className="section-numeral text-xl sm:text-2xl">§ Liquidity</span>
          <h1 className="font-display text-3xl sm:text-4xl text-fg mt-1">Provide liquidity</h1>
        </div>
        <Button variant="outline" size="sm" onClick={handleSync} disabled={syncing}>
          <RefreshCw className={`w-3 h-3 ${syncing ? "animate-spin" : ""}`} />
          {syncing ? "Syncing..." : "Sync totals"}
        </Button>
      </div>

      {isLoading && (
        <div className="grid sm:grid-cols-2 gap-4">
          {[0, 1].map((i) => (
            <div key={i} className="card-etched p-6 space-y-4">
              <Skeleton className="h-5 w-3/5" />
              <Skeleton className="h-4 w-2/5" />
              <Skeleton className="h-9 w-full" />
            </div>
          ))}
        </div>
      )}

      {!isLoading && allMarkets.length > 0 && (
        <div className="grid sm:grid-cols-2 gap-4">
          {allMarkets.map((addr, i) => <MarketLPCard key={addr} marketAddress={addr} marketIndex={i} />)}
        </div>
      )}

      {!isLoading && allMarkets.length === 0 && (
        <EmptyState title="No markets available" body="Markets will appear here once they are created." />
      )}
    </div>
  );
}
