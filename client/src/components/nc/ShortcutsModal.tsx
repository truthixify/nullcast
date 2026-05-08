"use client";

/**
 * Keyboard shortcuts overlay. Triggered by `?` key.
 * Handles G+M, G+P, G+V, G+L, G+S, G+A jump shortcuts and "N" for New market.
 */
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const GROUPS: { heading: string; rows: [string[], string][] }[] = [
  {
    heading: "Navigate",
    rows: [
      [["G", "M"], "Go to Markets"],
      [["G", "P"], "Go to Portfolio"],
      [["G", "V"], "Go to Vaults"],
      [["G", "L"], "Go to Liquidity"],
      [["G", "S"], "Go to Score"],
      [["G", "A"], "Go to Activity"],
    ],
  },
  {
    heading: "Actions",
    rows: [
      [["N"], "New market"],
      [["⌘", "K"], "Search / command palette"],
      [["?"], "Show this cheatsheet"],
    ],
  },
];

export const ShortcutsModal = () => {
  const [open, setOpen] = useState(false);
  const [pendingG, setPendingG] = useState(false);
  const router = useRouter();

  useEffect(() => {
    let gTimer: ReturnType<typeof setTimeout> | null = null;

    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement)?.isContentEditable) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      const k = e.key.toLowerCase();

      if (k === "?") { e.preventDefault(); setOpen((o) => !o); return; }

      if (pendingG) {
        const map: Record<string, string> = {
          m: "/markets", p: "/portfolio", v: "/vaults",
          l: "/liquidity", s: "/reputation", a: "/activity",
        };
        if (map[k]) { e.preventDefault(); router.push(map[k]); }
        setPendingG(false);
        if (gTimer) clearTimeout(gTimer);
        return;
      }

      if (k === "g") {
        setPendingG(true);
        if (gTimer) clearTimeout(gTimer);
        gTimer = setTimeout(() => setPendingG(false), 1200);
        return;
      }

      if (k === "n") { e.preventDefault(); router.push("/markets/create"); return; }
    };

    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      if (gTimer) clearTimeout(gTimer);
    };
  }, [pendingG, router]);

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg bg-background border-subtle p-0">
          <DialogHeader className="p-5 border-b border-subtle">
            <DialogTitle className="font-display text-lg flex items-center gap-2 text-fg">
              Keyboard shortcuts
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-fg-3 ml-auto">press ? to toggle</span>
            </DialogTitle>
          </DialogHeader>
          <div className="p-5 space-y-6">
            {GROUPS.map((g) => (
              <div key={g.heading}>
                <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-fg-3 mb-3">{g.heading}</div>
                <div className="space-y-1.5">
                  {g.rows.map(([keys, label]) => (
                    <div key={label} className="flex items-center justify-between text-sm">
                      <span className="text-fg-2">{label}</span>
                      <span className="flex items-center gap-1">
                        {keys.map((k, i) => (
                          <span key={i} className="font-mono text-[10px] px-1.5 py-1 rounded bg-surface-2 border border-subtle text-fg-2 min-w-[22px] text-center">
                            {k}
                          </span>
                        ))}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {pendingG && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 px-3 py-1.5 rounded border border-strong bg-surface-1 font-mono text-[11px] text-fg-2 animate-fade-in pointer-events-none">
          g · waiting for next key…
        </div>
      )}
    </>
  );
};
