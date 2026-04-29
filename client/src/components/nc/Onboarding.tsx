"use client";

/**
 * First-visit onboarding tour. Three steps with the sealed-envelope motif.
 * Persists "seen" flag to localStorage; user can re-open from Settings.
 */
import { useEffect, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { LogoMark } from "./Logo";
import { Lock, Eye, Coins } from "lucide-react";

const KEY = "nc.onboarded.v1";

const STEPS = [
  {
    chip: "Step I",
    title: "Your bets are sealed",
    body: "Size and side encrypt before they leave your device. The chain sees noise — never the cards.",
    icon: Lock,
  },
  {
    chip: "Step II",
    title: "Reveal at the river",
    body: "Markets resolve from oracles. You decide when to peek at your sealed positions.",
    icon: Eye,
  },
  {
    chip: "Step III",
    title: "Claim what you won",
    body: "Settlements drop straight into your sealed wallet. No middleman, no leak.",
    icon: Coins,
  },
];

export const Onboarding = () => {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!localStorage.getItem(KEY)) {
      const t = setTimeout(() => setOpen(true), 800);
      return () => clearTimeout(t);
    }
    const fn = () => { setStep(0); setOpen(true); };
    window.addEventListener("nc:open-onboarding", fn);
    return () => window.removeEventListener("nc:open-onboarding", fn);
  }, []);

  const finish = () => {
    try { localStorage.setItem(KEY, "1"); } catch { /* ignore */ }
    setOpen(false);
    setStep(0);
  };

  const s = STEPS[step];
  const Icon = s.icon;

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? setOpen(true) : finish())}>
      <DialogContent className="max-w-md bg-background border-subtle p-0 overflow-hidden">
        {/* Sealed envelope visual */}
        <div className="relative h-44 bg-surface-1 border-b border-subtle overflow-hidden">
          <div
            className="absolute inset-0 opacity-25"
            style={{
              backgroundImage:
                "repeating-linear-gradient(45deg, hsl(var(--primary)/0.18) 0px, hsl(var(--primary)/0.18) 1px, transparent 1px, transparent 8px)",
            }}
          />
          <div className="absolute inset-x-8 top-6 bottom-6 border border-primary/30 rounded flex items-center justify-center">
            <LogoMark size={56} className="opacity-60" />
          </div>
          <div className="absolute top-3 left-3 flex items-center gap-1.5">
            {STEPS.map((_, i) => (
              <span
                key={i}
                className={`h-1 w-6 rounded-full transition-colors ${i <= step ? "bg-primary" : "bg-fg-4"}`}
              />
            ))}
          </div>
          <button
            onClick={finish}
            className="absolute top-3 right-3 font-mono text-[10px] uppercase tracking-wider text-fg-3 hover:text-fg transition-colors"
          >
            Skip
          </button>
        </div>

        <div className="p-6">
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary flex items-center gap-2">
            <Icon className="h-3 w-3" /> {s.chip}
          </div>
          <h2 className="font-display text-2xl text-fg mt-2">{s.title}</h2>
          <p className="mt-3 text-sm text-fg-2 font-display leading-relaxed">{s.body}</p>

          <div className="mt-6 flex items-center justify-between">
            <button
              onClick={() => setStep((i) => Math.max(0, i - 1))}
              disabled={step === 0}
              className="font-mono text-xs text-fg-3 hover:text-fg disabled:opacity-30 transition-colors"
            >
              ← Back
            </button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => (step === STEPS.length - 1 ? finish() : setStep((i) => i + 1))}
            >
              {step === STEPS.length - 1 ? "Enter the table" : "Next"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
