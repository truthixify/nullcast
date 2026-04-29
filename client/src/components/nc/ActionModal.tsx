"use client";

/**
 * ActionModal — generic encrypted-action confirmation dialog.
 * Used for vault deposit/redeem, liquidity add/remove, claim, mint, etc.
 *
 * Variants drive the visual accent and the success messaging.
 */
import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useWallet, type TxKind } from "@/lib/wallet";
import { Lock } from "lucide-react";
import { sealed, failure } from "@/lib/notify";

export type ActionMode = "deposit" | "withdraw";

export interface ActionConfig {
  mode: ActionMode;
  txKind: TxKind;             // logged in wallet history
  title: string;              // "Deposit to Alpha Strategy"
  subject: string;            // "Alpha Strategy"
  meta?: { label: string; value: string }[];
  yourBalance?: number;       // override (e.g. LP share)
  cta?: string;               // override CTA
}

interface Props {
  open: boolean;
  onClose: () => void;
  config: ActionConfig | null;
  onConfirm?: (amount: number) => void;
}

const QUICK = [25, 100, 500, 1000];

export const ActionModal = ({ open, onClose, config, onConfirm }: Props) => {
  const w = useWallet();
  const [amt, setAmt] = useState("");
  const [phase, setPhase] = useState<"idle" | "sealing" | "done">("idle");

  useEffect(() => { if (!open) { setAmt(""); setPhase("idle"); } }, [open]);

  if (!config) return null;
  const num = parseFloat(amt) || 0;
  const isDeposit = config.mode === "deposit";
  const max = config.yourBalance ?? (isDeposit ? w.balance : 0);

  const submit = async () => {
    if (!num) return failure("Enter an amount");
    if (num > (config.yourBalance ?? w.balance) + (isDeposit ? 0 : 1e9)) return failure("Exceeds balance");
    if (isDeposit && num > w.balance) return failure("Insufficient wallet balance");

    setPhase("sealing");
    await new Promise((r) => setTimeout(r, 1100));

    if (isDeposit) w.debit(num, `${config.title}`, config.txKind);
    else            w.credit(num, `${config.title}`, config.txKind);

    onConfirm?.(num);
    setPhase("done");
    sealed(`${config.title} · ${num.toFixed(2)}`);
    setTimeout(() => { onClose(); }, 800);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md bg-background border-subtle p-0 gap-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="p-5 border-b border-subtle space-y-2">
          <DialogTitle className="font-display text-lg text-fg flex items-center gap-2">
            {config.title}
          </DialogTitle>
          <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-wider text-fg-3">
            <span>{isDeposit ? "Stake into the table" : "Pull back from the table"}</span>
            <span className="flex items-center gap-1.5"><Lock className="h-3 w-3" /> sealed</span>
          </div>
        </DialogHeader>

        <div className="p-5 space-y-5">
          {/* Amount */}
          <div>
            <label className="font-mono text-[10px] uppercase tracking-[0.18em] text-fg-3 flex items-center justify-between">
              <span>Amount</span>
              <span className="text-fg-4 normal-case">
                {isDeposit ? `wallet ${w.balance.toFixed(2)}` : `position ${max.toFixed(2)}`}
              </span>
            </label>
            <Input
              value={amt}
              onChange={(e) => setAmt(e.target.value.replace(/[^0-9.]/g, ""))}
              placeholder="0.00"
              autoFocus
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
              <button
                onClick={() => setAmt(String(max))}
                className="font-mono text-xs h-7 rounded text-primary hover:bg-surface-2 transition-colors"
              >
                Max
              </button>
            </div>
          </div>

          {/* Meta */}
          {config.meta?.length ? (
            <div className="rounded border border-subtle bg-surface-1/40 divide-y divide-[hsl(var(--border)/0.06)]">
              {config.meta.map((m) => (
                <div key={m.label} className="flex items-center justify-between px-4 py-2.5 font-mono text-xs">
                  <span className="text-fg-3 uppercase tracking-wider text-[10px]">{m.label}</span>
                  <span className="text-fg-2 tnum">{m.value}</span>
                </div>
              ))}
            </div>
          ) : null}

          <Button
            onClick={submit}
            variant="primary"
            size="lg"
            disabled={phase !== "idle"}
            className={`w-full h-12 ${phase === "done" ? "shimmer-gold animate-shimmer" : ""}`}
          >
            {phase === "idle"    && (config.cta ?? (isDeposit ? "Seal deposit" : "Seal withdrawal"))}
            {phase === "sealing" && "Sealing in envelope…"}
            {phase === "done"    && "Sealed ✓"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

/** Convenience hook for screens to summon ActionModal. */
import { useCallback, useState as useReactState } from "react";
export const useAction = () => {
  const [config, setConfig] = useReactState<ActionConfig | null>(null);
  const [open, setOpen] = useReactState(false);
  const launch = useCallback((c: ActionConfig) => { setConfig(c); setOpen(true); }, []);
  const close = useCallback(() => setOpen(false), []);
  const node = (extra?: { onConfirm?: (n: number) => void }) => (
    <ActionModal open={open} onClose={close} config={config} onConfirm={extra?.onConfirm} />
  );
  return { launch, close, node };
};
