"use client";

/**
 * WalletDrawer — sealed wallet UI. Side-sheet on desktop, bottom-sheet on mobile.
 * Tabs: Deposit · Withdraw · Send · History.
 */
import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { fmtAmt, relTime, TX_LABELS, useWallet, type TxKind } from "@/lib/wallet";
import { ArrowDownLeft, ArrowUpRight, Send, History, Copy, Check, Lock } from "lucide-react";
import { sealed, failure } from "@/lib/notify";
import { Logo } from "./Logo";

const TABS = [
  { id: "deposit",  label: "Deposit",  icon: ArrowDownLeft },
  { id: "withdraw", label: "Withdraw", icon: ArrowUpRight },
  { id: "send",     label: "Send",     icon: Send },
  { id: "history",  label: "History",  icon: History },
] as const;

const QUICK = [50, 100, 250, 500, 1000];

export const WalletDrawer = () => {
  const w = useWallet();
  const [amt, setAmt] = useState("");
  const [to, setTo] = useState("");
  const [phase, setPhase] = useState<"idle" | "sealing" | "done">("idle");
  const [copied, setCopied] = useState(false);

  useEffect(() => { if (!w.drawerOpen) { setAmt(""); setTo(""); setPhase("idle"); } }, [w.drawerOpen]);

  const num = parseFloat(amt) || 0;

  const submit = async () => {
    if (!num) return failure("Enter an amount");
    if (w.drawerTab === "send" && !to) return failure("Enter a recipient");
    if (w.drawerTab !== "deposit" && num > w.balance) return failure("Insufficient balance");

    setPhase("sealing");
    await new Promise((r) => setTimeout(r, 1100));

    if (w.drawerTab === "deposit")        w.credit(num, "Funded from L1 bridge", "deposit");
    else if (w.drawerTab === "withdraw")  w.debit(num, "Withdrew to L1", "withdraw");
    else if (w.drawerTab === "send")      w.debit(num, `Sent to ${to.slice(0, 6)}…${to.slice(-4)}`, "send");

    setPhase("done");
    sealed(w.drawerTab === "deposit" ? "Funds sealed in vault" : w.drawerTab === "withdraw" ? "Withdrawal sealed" : "Send sealed");
    setTimeout(() => { setAmt(""); setTo(""); setPhase("idle"); }, 900);
  };

  const copy = () => {
    navigator.clipboard.writeText("0x7a3c4d6e9b1f2a8c0d4e19").then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <Sheet open={w.drawerOpen} onOpenChange={(o) => o ? w.openWallet() : w.closeWallet()}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-[420px] bg-background border-l border-subtle p-0 flex flex-col"
      >
        {/* Header */}
        <SheetHeader className="p-5 border-b border-subtle space-y-0">
          <div className="flex items-center justify-between">
            <SheetTitle className="font-display text-base flex items-center gap-2 text-fg">
              <Logo mark size={14} /> Wallet
            </SheetTitle>
            <span className="font-mono text-[10px] uppercase tracking-wider text-fg-3 flex items-center gap-1.5">
              <Lock className="h-3 w-3" /> sealed
            </span>
          </div>

          <div className="mt-5 flex items-end justify-between">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-fg-3">Balance</div>
              <div className="font-mono tnum text-4xl text-fg mt-1">
                {w.balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="font-mono text-[10px] text-fg-4 mt-1">cUSDT</div>
            </div>
            <button
              onClick={copy}
              className="flex items-center gap-1.5 px-2.5 h-7 rounded border border-subtle hover:border-strong text-xs font-mono text-fg-3 hover:text-fg transition-colors"
            >
              {w.address}
              {copied ? <Check className="h-3 w-3 text-yes" /> : <Copy className="h-3 w-3" />}
            </button>
          </div>
        </SheetHeader>

        {/* Tabs */}
        <div className="flex border-b border-subtle">
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = w.drawerTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => w.setTab(t.id)}
                className={`flex-1 flex flex-col items-center gap-1 py-3 transition-colors border-b-2 ${
                  active ? "border-primary text-fg" : "border-transparent text-fg-3 hover:text-fg-2"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span className="font-mono text-[10px] uppercase tracking-wider">{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {w.drawerTab === "history" ? (
            <HistoryList />
          ) : (
            <div className="space-y-5">
              {w.drawerTab === "send" && (
                <div>
                  <label className="font-mono text-[10px] uppercase tracking-[0.18em] text-fg-3">Recipient</label>
                  <Input
                    value={to}
                    onChange={(e) => setTo(e.target.value)}
                    placeholder="0x…"
                    className="mt-2 h-11 font-mono bg-surface-1 border-subtle"
                  />
                </div>
              )}

              <div>
                <label className="font-mono text-[10px] uppercase tracking-[0.18em] text-fg-3">
                  Amount {w.drawerTab !== "deposit" && <span className="text-fg-4 normal-case ml-2">max {w.balance.toFixed(2)}</span>}
                </label>
                <Input
                  value={amt}
                  onChange={(e) => setAmt(e.target.value.replace(/[^0-9.]/g, ""))}
                  placeholder="0.00"
                  inputMode="decimal"
                  className="mt-2 h-14 text-3xl font-mono tnum bg-transparent border-subtle focus-visible:border-strong px-4 [&]:text-fg"
                />
                <div className="mt-2 grid grid-cols-5 gap-1.5">
                  {QUICK.map((q) => (
                    <button
                      key={q}
                      onClick={() => setAmt(String(q))}
                      className="font-mono text-xs h-7 rounded text-fg-3 hover:text-fg hover:bg-surface-2 transition-colors"
                    >
                      {q}
                    </button>
                  ))}
                  {w.drawerTab !== "deposit" && (
                    <button
                      onClick={() => setAmt(String(w.balance))}
                      className="font-mono text-xs h-7 rounded text-primary hover:bg-surface-2 transition-colors col-span-5"
                    >
                      Max
                    </button>
                  )}
                </div>
              </div>

              {/* Summary */}
              <div className="rounded border border-subtle bg-surface-1/40 p-4 space-y-2 font-mono text-xs">
                <Row k="Action" v={TABS.find((t) => t.id === w.drawerTab)!.label} />
                <Row k="Amount" v={`${num.toFixed(2)} cUSDT`} mono />
                <Row k="Fee"     v="~0.0008 ETH" mono />
                <div className="pt-2 border-t border-subtle/60 flex items-center justify-between">
                  <span className="text-fg-3 uppercase tracking-wider text-[10px]">After</span>
                  <span className="text-fg tnum">
                    {(w.drawerTab === "deposit"
                      ? w.balance + num
                      : w.balance - num
                    ).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} cUSDT
                  </span>
                </div>
              </div>

              <Button
                onClick={submit}
                variant="primary"
                size="lg"
                disabled={phase !== "idle"}
                className={`w-full h-12 ${phase === "done" ? "shimmer-gold animate-shimmer" : ""}`}
              >
                {phase === "idle" && (w.drawerTab === "deposit" ? "Seal deposit" : w.drawerTab === "withdraw" ? "Seal withdrawal" : "Seal send")}
                {phase === "sealing" && "Sealing in envelope…"}
                {phase === "done" && "Sealed ✓"}
              </Button>

              <p className="font-mono text-[10px] text-fg-4 text-center leading-relaxed">
                Amount encrypted before broadcast. The chain sees noise.
              </p>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

const Row = ({ k, v, mono }: { k: string; v: string; mono?: boolean }) => (
  <div className="flex items-center justify-between">
    <span className="text-fg-3 uppercase tracking-wider text-[10px]">{k}</span>
    <span className={`text-fg-2 ${mono ? "tnum" : ""}`}>{v}</span>
  </div>
);

const KIND_ICON: Record<TxKind, string> = {
  deposit: "↓", withdraw: "↑", send: "→",
  bet: "●", claim: "✓", lp_in: "+", lp_out: "−",
  vault_in: "▼", vault_out: "▲", mint: "✦",
};

const HistoryList = () => {
  const { txs } = useWallet();
  return (
    <div className="space-y-px">
      <div className="flex items-center justify-between mb-3">
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-fg-3">{txs.length} entries</span>
        <span className="font-mono text-[10px] uppercase tracking-wider text-fg-4">amounts sealed off-chain</span>
      </div>
      {txs.map((t) => {
        const positive = t.amount > 0;
        return (
          <div key={t.id} className="flex items-center gap-3 py-3 border-b border-subtle/50 last:border-0">
            <div
              className="h-8 w-8 rounded border border-subtle flex items-center justify-center font-mono text-sm shrink-0"
              style={{
                color: positive ? "hsl(var(--yes))" : "hsl(var(--no))",
                background: positive ? "hsl(var(--yes)/0.06)" : "hsl(var(--no)/0.06)",
              }}
            >
              {KIND_ICON[t.kind]}
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-display text-sm text-fg truncate">{t.label}</div>
              <div className="font-mono text-[10px] uppercase tracking-wider text-fg-3 mt-0.5 flex items-center gap-2">
                <span>{TX_LABELS[t.kind]}</span>
                <span className="text-fg-4">·</span>
                <span>{relTime(t.ts)} ago</span>
                {t.sealed && <><span className="text-fg-4">·</span><span className="flex items-center gap-1"><Lock className="h-2.5 w-2.5" /> sealed</span></>}
              </div>
            </div>
            <div className={`font-mono tnum text-sm shrink-0 ${positive ? "text-yes" : "text-no"}`}>
              {fmtAmt(t.amount)}
            </div>
          </div>
        );
      })}
    </div>
  );
};
