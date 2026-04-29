"use client";

import { useSettings, ACCENTS, type Currency, type Lang } from "@/lib/settings";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { sealed } from "@/lib/notify";
import { Check } from "lucide-react";

const CURRENCIES: { id: Currency; label: string; sym: string }[] = [
  { id: "USD", label: "US Dollar",     sym: "$" },
  { id: "EUR", label: "Euro",           sym: "€" },
  { id: "GBP", label: "British Pound",  sym: "£" },
];
const LANGS: { id: Lang; label: string }[] = [
  { id: "en", label: "English" },
  { id: "es", label: "Español" },
  { id: "fr", label: "Français" },
];

const Section = ({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) => (
  <section className="grid sm:grid-cols-[200px_1fr] gap-4 sm:gap-8 pb-8 border-b border-subtle">
    <div>
      <div className="font-display text-base text-fg">{title}</div>
      {desc && <div className="font-display text-xs text-fg-3 mt-1 leading-relaxed">{desc}</div>}
    </div>
    <div>{children}</div>
  </section>
);

const ToggleRow = ({ label, checked, onChange }: { label: string; checked: boolean; onChange: (b: boolean) => void }) => (
  <label className="flex items-center justify-between gap-4 px-4 py-3 rounded border border-subtle cursor-pointer">
    <span className="text-sm text-fg-2">{label}</span>
    <Switch checked={checked} onCheckedChange={onChange} />
  </label>
);

export default function SettingsPage() {
  const s = useSettings();

  return (
    <div className="max-w-[760px] mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-10">
      <div>
        <span className="section-numeral text-xl sm:text-2xl">§ Settings</span>
        <h1 className="font-display text-3xl sm:text-4xl text-fg mt-1">Tune the table</h1>
      </div>

      <Section title="Accent" desc="The colour of value across the app.">
        <div className="grid grid-cols-3 gap-3">
          {ACCENTS.map((a) => {
            const active = s.accent === a.id;
            return (
              <button
                key={a.id}
                onClick={() => s.setAccent(a.id)}
                className={`relative rounded border p-4 text-left transition-all ${
                  active ? "border-strong bg-surface-1" : "border-subtle hover:border-strong"
                }`}
              >
                <div className="h-10 rounded mb-3"
                  style={{
                    background: `linear-gradient(135deg, hsl(${a.hsl}) 0%, hsl(${a.hsl} / 0.4) 100%)`,
                    boxShadow: `0 0 18px hsl(${a.hsl} / 0.35)`,
                  }}
                />
                <div className="font-display text-sm text-fg">{a.label}</div>
                {active && (
                  <span className="absolute top-2 right-2 h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                    <Check className="h-3 w-3 text-primary-foreground" />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </Section>

      <Section title="Reveal by default" desc="Show sealed values without tapping reveal each time.">
        <ToggleRow label="Auto-reveal positions on Portfolio & Liquidity" checked={s.revealByDefault} onChange={s.setRevealByDefault} />
      </Section>

      <Section title="Motion" desc="Soften animations like sealed-envelope reveals and shimmer.">
        <ToggleRow label="Reduce motion" checked={s.reducedMotion} onChange={s.setReducedMotion} />
      </Section>

      <Section title="Currency display" desc="Used for fiat hints. Settlement is always cUSDT.">
        <div className="grid grid-cols-3 gap-2">
          {CURRENCIES.map((c) => {
            const active = s.currency === c.id;
            return (
              <button key={c.id} onClick={() => s.setCurrency(c.id)}
                className={`rounded border py-3 text-center transition-colors ${
                  active ? "border-primary text-fg bg-surface-1" : "border-subtle text-fg-3 hover:text-fg hover:border-strong"
                }`}>
                <div className="font-mono tnum text-xl">{c.sym}</div>
                <div className="font-mono text-[10px] uppercase tracking-wider mt-1">{c.id}</div>
              </button>
            );
          })}
        </div>
      </Section>

      <Section title="Language" desc="Interface labels. Market questions remain as authored.">
        <div className="grid grid-cols-3 gap-2">
          {LANGS.map((l) => {
            const active = s.lang === l.id;
            return (
              <button key={l.id} onClick={() => s.setLang(l.id)}
                className={`rounded border py-3 text-center transition-colors font-display text-sm ${
                  active ? "border-primary text-fg bg-surface-1" : "border-subtle text-fg-3 hover:text-fg hover:border-strong"
                }`}>
                {l.label}
              </button>
            );
          })}
        </div>
      </Section>

      <Section title="Onboarding" desc="Replay the three-step welcome tour.">
        <Button variant="outline" size="sm" onClick={() => window.dispatchEvent(new Event("nc:open-onboarding"))}>
          Replay tour
        </Button>
      </Section>

      <Section title="About" desc="">
        <div className="font-mono text-xs text-fg-3 space-y-1">
          <div>NullCast</div>
          <div>Build: {new Date().toISOString().slice(0, 10)}</div>
          <Button variant="link" size="sm" className="px-0" onClick={() => sealed("Diagnostics sent")}>
            Send diagnostics
          </Button>
        </div>
      </Section>
    </div>
  );
}
