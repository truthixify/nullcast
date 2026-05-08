"use client";

import Link from "next/link";
import { useReadContract } from "wagmi";
import { Button } from "@/components/ui/button";
import { LogoMark } from "@/components/nc/Logo";
import { OddsBar } from "@/components/nc/OddsBar";
import { nullCastFactoryConfig, vaultFactoryConfig } from "@/lib/contracts";
import { useFactoryMarkets } from "@/hooks/useFactory";
import { useMarket } from "@/hooks/useMarket";

const HOUSE_RULES = [
  { n: "I", title: "Bet without showing", body: "Your size and side stay encrypted on-chain. Front-runners see noise." },
  { n: "II", title: "Settle on the truth", body: "Markets resolve from oracles. Winners claim, losers learn. No middle." },
  { n: "III", title: "The house has no cards", body: "There is no operator. The protocol is the table. Code is the dealer." },
];

function useProtocolStats() {
  const { data: marketCount } = useReadContract({ ...nullCastFactoryConfig, functionName: "getMarketCount" });
  const { data: vaultCount } = useReadContract({ ...vaultFactoryConfig, functionName: "getVaultCount" });
  return { markets: marketCount ? Number(marketCount) : 0, vaults: vaultCount ? Number(vaultCount) : 0 };
}

function TickerItem({ address, index }: { address: `0x${string}`; index: number }) {
  const { question, yesOdds, totalPool, isOddsLoading } = useMarket(address);
  if (!question) return null;
  const poolStr = totalPool >= 1_000 ? `$${(totalPool / 1_000).toFixed(1)}k` : `$${totalPool.toFixed(0)}`;
  return (
    <Link href={`/markets/${index}`} className="flex items-center gap-3 px-8 border-r border-subtle hover:bg-surface-2 transition-colors">
      <span className="font-display text-fg text-sm max-w-[280px] truncate">{question}</span>
      <span className="font-mono tnum text-yes text-sm">{isOddsLoading ? "..." : `${yesOdds}%`}</span>
      <span className="font-mono text-fg-3 text-xs">{poolStr}</span>
    </Link>
  );
}

function LiveTicker() {
  const { allMarkets } = useFactoryMarkets();
  if (allMarkets.length === 0) return null;
  const doubled = [...allMarkets, ...allMarkets];
  return (
    <div className="overflow-hidden border-y border-subtle bg-surface-1/50">
      <div className="flex animate-marquee whitespace-nowrap py-3">
        {doubled.map((addr, i) => (
          <TickerItem key={`${addr}-${i}`} address={addr} index={i % allMarkets.length} />
        ))}
      </div>
    </div>
  );
}

function SpecCard({ address }: { address: `0x${string}` }) {
  const { question, yesOdds, totalPool, isOddsLoading } = useMarket(address);
  const poolStr = totalPool >= 1_000 ? `$${(totalPool / 1_000).toFixed(1)}k` : `$${totalPool.toFixed(0)}`;

  return (
    <div className="relative w-full max-w-[420px]">
      <div className="absolute inset-0 translate-x-3 translate-y-3 rounded border border-subtle/60 bg-surface-1/60" />
      <div className="absolute inset-0 translate-x-1.5 translate-y-1.5 rounded border border-subtle bg-surface-1/80" />
      <div className="relative rounded border border-strong bg-surface-1 p-5 backdrop-blur-xl">
        <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.18em] text-fg-3">
          <span className="flex items-center gap-1.5"><span className="live-dot" /> Live order</span>
          <span className="text-primary flex items-center gap-1.5">sealed · euint64</span>
        </div>
        <h3 className="font-display text-[18px] leading-snug text-fg mt-4">
          {question ?? "Loading..."}
        </h3>
        <div className="mt-4">
          {!isOddsLoading && <OddsBar yes={yesOdds} height={10} showLabels={false} />}
          <div className="mt-1.5 flex justify-between font-mono text-[11px]">
            <span className="text-yes tnum">YES {isOddsLoading ? "..." : `${yesOdds}%`}</span>
            <span className="text-no tnum">{isOddsLoading ? "..." : `${100 - yesOdds}%`} NO</span>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-3 gap-3 text-[11px] font-mono">
          {([["Bet", "100.00"], ["Side", "YES"], ["Pays", "---"]] as const).map(([k, v]) => (
            <div key={k} className="border-l border-primary/40 pl-2.5">
              <div className="text-fg-3 uppercase tracking-wider text-[9px]">{k}</div>
              <div className="text-fg tnum mt-1">{v}</div>
            </div>
          ))}
        </div>
        <div className="mt-5 pt-4 border-t border-subtle font-mono text-[10px] text-fg-3 flex items-center justify-between">
          <span>Encrypted: <span className="text-primary">euint64 ●●●●●●●●</span></span>
          <span>{poolStr} pool</span>
        </div>
      </div>
    </div>
  );
}

function FeaturedMarketCard({ address, index }: { address: `0x${string}`; index: number }) {
  const { question, yesOdds, category, isLoading, isOddsLoading } = useMarket(address);
  if (isLoading || !question) return null;

  return (
    <Link href={`/markets/${index}`} className="card-etched p-6 flex flex-col gap-4 hover:bg-surface-2/30 transition-colors group">
      <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-wider text-fg-3">
        <span>{category ?? "Other"}</span>
      </div>
      <h3 className="font-display text-lg leading-snug text-fg group-hover:text-primary transition-colors min-h-[3.5rem]">
        {question}
      </h3>
      <div>
        <div className="font-mono tnum text-3xl text-yes">{isOddsLoading ? "..." : `${yesOdds}%`}</div>
        <div className="font-mono text-[10px] uppercase tracking-wider text-fg-3 mt-1">YES</div>
      </div>
    </Link>
  );
}

const StatPlaque = ({ value, label, idx }: { value: string; label: string; idx: string }) => (
  <div className="plaque p-6 group">
    <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-fg-3 flex items-center gap-2">
      <span className="section-numeral text-sm">{idx}</span>
      <span className="h-px flex-1 bg-subtle" />
    </div>
    <div className="mt-4 font-mono tnum text-4xl md:text-5xl text-fg group-hover:text-primary transition-colors">{value}</div>
    <div className="mt-2 font-mono text-[11px] uppercase tracking-wider text-fg-3">{label}</div>
  </div>
);

export default function LandingPage() {
  const stats = useProtocolStats();
  const { allMarkets } = useFactoryMarkets();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="px-6 py-5 border-b border-subtle/50">
        <div className="max-w-[1280px] mx-auto flex items-center justify-between">
          <Link href="/" className="group flex items-center gap-2.5">
            <LogoMark size={24} className="transition-transform group-hover:rotate-[8deg]" />
            <span className="font-display text-lg tracking-tight leading-none">
              null<span className="italic text-primary">cast</span>
            </span>
          </Link>
          <div className="flex items-center gap-5">
            <Link href="/markets" className="text-sm text-fg-2 hover:text-fg transition-colors">Markets</Link>
            <Link href="/vaults" className="text-sm text-fg-2 hover:text-fg transition-colors hidden sm:inline">Vaults</Link>
            <Link href="/reputation" className="text-sm text-fg-2 hover:text-fg transition-colors hidden sm:inline">Score</Link>
            <Button asChild variant="primary" size="sm"><Link href="/markets">Launch app</Link></Button>
          </div>
        </div>
      </header>

      <section className="px-6 py-16 md:py-24 relative overflow-hidden">
        <div className="absolute -right-32 -top-20 opacity-[0.035] pointer-events-none select-none">
          <LogoMark size={620} />
        </div>
        <div className="max-w-[1280px] mx-auto grid lg:grid-cols-[1.4fr_1fr] gap-16 items-center relative">
          <div>
            <div className="flex items-center gap-3 mb-8">
              <span className="h-px w-10 bg-primary/60" />
              <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-primary/90">NullCast Protocol</span>
            </div>
            <h1 className="font-display text-[56px] md:text-[88px] leading-[0.95] tracking-tight text-fg">
              The house<br />can&apos;t see<br /><span className="italic text-primary">your cards.</span>
            </h1>
            <p className="mt-8 font-display text-lg md:text-xl text-fg-2 max-w-xl leading-relaxed">
              Prediction markets where positions stay sealed. Place a bet without showing the table what you&apos;re holding. Settle when the truth arrives.
            </p>
            <div className="mt-10 flex items-center gap-3">
              <Button asChild variant="primary" size="xl"><Link href="/markets">Trade now</Link></Button>
              <Button asChild variant="outline" size="xl"><Link href="/markets">View markets</Link></Button>
            </div>
            <div className="mt-10 flex items-center gap-6 font-mono text-[11px] text-fg-3">
              <span className="flex items-center gap-2"><span className="live-dot" /> Live</span>
              <span className="text-fg-4">·</span>
              <span>0.30% fee · No KYC · Open source</span>
            </div>
          </div>
          <div className="flex justify-center lg:justify-end">
            {allMarkets.length > 0 ? (
              <SpecCard address={allMarkets[0]} />
            ) : (
              <div className="relative w-full max-w-[420px] rounded border border-subtle bg-surface-1 p-8 text-center">
                <div className="font-display text-fg-3 italic">No markets yet</div>
                <div className="font-mono text-[10px] text-fg-4 mt-2">Create the first market to see a live preview here</div>
              </div>
            )}
          </div>
        </div>
      </section>

      <LiveTicker />

      <section className="px-6 py-20">
        <div className="max-w-[1280px] mx-auto">
          <div className="flex items-end justify-between mb-10">
            <div>
              <span className="section-numeral text-3xl">§ I</span>
              <h2 className="font-display text-3xl text-fg mt-2">By the numbers</h2>
            </div>
            <span className="font-mono text-[10px] uppercase tracking-wider text-fg-3 hidden md:block">Live on-chain · Sepolia testnet</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-transparent">
            <StatPlaque idx="01" value={stats.markets ? String(stats.markets) : "..."} label="Live markets" />
            <StatPlaque idx="02" value={stats.vaults ? String(stats.vaults) : "..."} label="Strategy vaults" />
            <StatPlaque idx="03" value="FHE" label="Encryption" />
            <StatPlaque idx="04" value="Sepolia" label="Network" />
          </div>
        </div>
      </section>

      {allMarkets.length > 0 && (
        <section className="px-6 py-12 border-t border-subtle">
          <div className="max-w-[1280px] mx-auto">
            <div className="flex items-end justify-between mb-8">
              <div>
                <span className="section-numeral text-3xl">§ II</span>
                <h2 className="font-display text-3xl text-fg mt-2">On the table</h2>
              </div>
              <Link href="/markets" className="font-mono text-xs text-fg-3 hover:text-fg transition-colors">All markets →</Link>
            </div>
            <div className="grid md:grid-cols-3 gap-px">
              {allMarkets.slice(0, 3).map((addr, i) => (
                <FeaturedMarketCard key={addr} address={addr} index={i} />
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="px-6 py-20 border-t border-subtle">
        <div className="max-w-[1280px] mx-auto">
          <div className="mb-10">
            <span className="section-numeral text-3xl">§ III</span>
            <h2 className="font-display text-3xl text-fg mt-2">House rules</h2>
            <p className="mt-2 text-fg-3 font-display max-w-xl">Three principles. Etched, not negotiable.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-px">
            {HOUSE_RULES.map((r) => (
              <div key={r.n} className="card-etched p-8 relative overflow-hidden group">
                <div className="font-display italic text-primary text-7xl absolute -top-2 -right-1 opacity-15 group-hover:opacity-30 transition-opacity">{r.n}</div>
                <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary relative">Rule {r.n}</div>
                <h3 className="font-display text-2xl text-fg mt-4 relative">{r.title}</h3>
                <p className="mt-4 text-sm text-fg-2 leading-relaxed font-display relative">{r.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 py-24 border-t border-subtle relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.04]">
            <LogoMark size={420} />
          </div>
        </div>
        <div className="max-w-[1280px] mx-auto text-center relative">
          <h2 className="font-display text-4xl md:text-6xl text-fg leading-tight">
            Sit down. <span className="italic text-primary">Place your bet.</span>
          </h2>
          <p className="mt-5 text-fg-2 font-display text-lg max-w-md mx-auto">The cards stay face-down until the river.</p>
          <div className="mt-10 flex items-center justify-center gap-3">
            <Button asChild variant="primary" size="xl"><Link href="/markets">Enter the table</Link></Button>
          </div>
        </div>
      </section>

      <footer className="border-t border-subtle py-6">
        <div className="max-w-[1280px] mx-auto px-6 flex items-center justify-between text-xs text-fg-3">
          <div className="flex items-center gap-2">
            <LogoMark size={14} />
            <span className="font-display italic">The house can&apos;t see your cards.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
