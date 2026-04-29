"use client";

/**
 * PnLDock — floating bottom-right HUD showing live encrypted PnL.
 * Click to expand, click again to collapse. Slot-machine reveal numbers.
 */
import { useState } from "react";
import Link from "next/link";
import { POSITIONS } from "@/data/markets";
import { RevealNumber } from "./RevealNumber";
import { ChevronUp, ChevronDown } from "lucide-react";

export const PnLDock = () => {
  const [open, setOpen] = useState(false);
  const [revealed, setRevealed] = useState(false);

  const totalPnl = POSITIONS.reduce((s, p) => s + p.pnl, 0);
  const positive = totalPnl >= 0;

  return (
    <div className="fixed bottom-12 right-6 z-40 print:hidden hidden lg:block">
      <div
        className="rounded border border-subtle bg-surface-1/95 backdrop-blur-xl shadow-[0_20px_60px_-20px_rgba(0,0,0,0.8)] overflow-hidden transition-all duration-300"
        style={{ width: open ? 280 : 168 }}
      >
        {/* Header strip */}
        <button
          onClick={() => setOpen((o) => !o)}
          className="w-full flex items-center gap-2 px-3 h-9 hover:bg-surface-2/60 transition-colors"
        >
          <span className="live-dot" />
          <span className="font-mono text-[10px] uppercase tracking-wider text-fg-3">P&amp;L</span>
          <RevealNumber
            value={(positive ? "+" : "") + totalPnl.toFixed(2)}
            revealed={revealed}
            className={`text-xs ml-auto ${revealed ? (positive ? "!text-yes" : "!text-no") : ""}`}
          />
          {open ? <ChevronDown className="h-3 w-3 text-fg-3" /> : <ChevronUp className="h-3 w-3 text-fg-3" />}
        </button>

        {/* Expanded body */}
        {open && (
          <div className="border-t border-subtle p-3 space-y-2 animate-fade-in">
            <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-wider text-fg-3">
              <span>{POSITIONS.length} positions</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setRevealed((r) => !r);
                }}
                className="text-primary hover:brightness-125 transition-all"
              >
                {revealed ? "Conceal" : "Reveal"}
              </button>
            </div>
            <div className="space-y-1.5 max-h-48 overflow-y-auto no-scrollbar">
              {POSITIONS.map((p, i) => (
                <div key={i} className="flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span
                      className="h-1 w-1 rounded-full shrink-0"
                      style={{ background: p.side === "YES" ? "hsl(var(--yes))" : "hsl(var(--no))" }}
                    />
                    <span className="font-mono text-fg-3 truncate">{p.marketId}</span>
                  </div>
                  <RevealNumber
                    value={(p.pnl >= 0 ? "+" : "") + p.pnl.toFixed(2)}
                    revealed={revealed}
                    className={`text-[11px] ${revealed ? (p.pnl >= 0 ? "!text-yes" : "!text-no") : ""}`}
                  />
                </div>
              ))}
            </div>
            <Link
              href="/portfolio"
              className="block text-center font-mono text-[10px] uppercase tracking-wider text-fg-3 hover:text-fg pt-2 border-t border-subtle"
            >
              Open portfolio →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};
