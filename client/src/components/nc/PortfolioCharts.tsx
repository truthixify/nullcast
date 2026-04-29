/**
 * Portfolio analytics — sealed P&L over time, win-rate dial, category ring.
 */
import { POSITIONS, MARKETS } from "@/data/markets";
import { Sparkline } from "./Sparkline";

/** Synthetic 30-day P&L curve derived from current positions. */
const buildPnlCurve = () => {
  const target = POSITIONS.reduce((s, p) => s + p.pnl, 0);
  const days = 30;
  let v = 0;
  return Array.from({ length: days }, (_, i) => {
    const noise = Math.sin(i / 2) * 4 + (Math.random() - 0.5) * 6;
    v = (i / days) * target + noise;
    return v;
  });
};

export const PnlChart = ({ revealed }: { revealed: boolean }) => {
  const data = buildPnlCurve();
  const last = data[data.length - 1];
  const up = last >= 0;

  return (
    <div className="border border-subtle rounded p-5 bg-surface-1/40">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-fg-3">P&L · 30d</div>
          <div className={`font-mono tnum text-2xl mt-1 ${revealed ? (up ? "text-yes" : "text-no") : "text-fg"}`}>
            {revealed ? `${up ? "+" : ""}${last.toFixed(2)}` : "●●●●●"}
          </div>
        </div>
        <span className="font-mono text-[10px] uppercase tracking-wider text-fg-3">cUSDT</span>
      </div>
      <div className="mt-3">
        <Sparkline
          data={revealed ? data : data.map(() => 0).map((_, i) => Math.sin(i / 4) * 2)}
          width={400}
          height={56}
          stroke={revealed ? (up ? "hsl(var(--yes))" : "hsl(var(--no))") : "hsl(var(--foreground-3))"}
          fill={revealed ? (up ? "hsl(var(--yes) / 0.12)" : "hsl(var(--no) / 0.12)") : "hsl(var(--foreground-3) / 0.06)"}
          className="w-full"
        />
      </div>
    </div>
  );
};

export const WinRateDial = ({ pct = 64 }: { pct?: number }) => {
  const r = 36;
  const c = 2 * Math.PI * r;
  return (
    <div className="border border-subtle rounded p-5 bg-surface-1/40 flex items-center gap-5">
      <div className="relative h-[90px] w-[90px] shrink-0">
        <svg width="90" height="90" className="-rotate-90">
          <circle cx="45" cy="45" r={r} stroke="hsl(var(--border)/0.08)" strokeWidth="6" fill="none" />
          <circle
            cx="45" cy="45" r={r}
            stroke="hsl(var(--primary))"
            strokeWidth="6"
            strokeLinecap="round"
            fill="none"
            strokeDasharray={c}
            strokeDashoffset={c - (pct / 100) * c}
            className="transition-all duration-700"
            style={{ filter: "drop-shadow(0 0 4px hsl(var(--primary)/0.4))" }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center font-mono tnum text-xl text-fg">{pct}%</div>
      </div>
      <div>
        <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-fg-3">Win rate</div>
        <div className="font-display text-fg text-base mt-1">Sharper than the table</div>
        <div className="font-mono text-[10px] text-fg-3 mt-1">last 30 settled</div>
      </div>
    </div>
  );
};

export const CategoryBreakdown = ({ revealed }: { revealed: boolean }) => {
  const totals = new Map<string, number>();
  POSITIONS.forEach((p) => {
    const m = MARKETS.find((x) => x.id === p.marketId);
    if (!m) return;
    totals.set(m.category, (totals.get(m.category) ?? 0) + p.size);
  });
  const entries = Array.from(totals.entries());
  const sum = entries.reduce((s, [, v]) => s + v, 0) || 1;
  const colors = ["hsl(var(--primary))", "hsl(var(--yes))", "hsl(var(--no))", "hsl(var(--reveal))"];

  return (
    <div className="border border-subtle rounded p-5 bg-surface-1/40">
      <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-fg-3 mb-4">Exposure by category</div>
      <div className="space-y-3">
        {entries.map(([cat, val], i) => {
          const pct = (val / sum) * 100;
          return (
            <div key={cat}>
              <div className="flex items-center justify-between font-mono text-xs mb-1">
                <span className="text-fg-2 flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: colors[i % colors.length] }} />
                  {cat}
                </span>
                <span className="text-fg tnum">{revealed ? `${pct.toFixed(0)}%` : "●●%"}</span>
              </div>
              <div className="h-1 rounded-full bg-surface-3 overflow-hidden">
                <div
                  className="h-full transition-all duration-700"
                  style={{ width: `${pct}%`, background: colors[i % colors.length] }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/** Build a CSV blob and trigger download — for "Export history". */
export const downloadHistoryCsv = () => {
  const header = "market,side,size,entry_odds,current_odds,pnl";
  const rows = POSITIONS.map((p) => {
    const m = MARKETS.find((x) => x.id === p.marketId)!;
    return [
      `"${m.question.replace(/"/g, '""')}"`,
      p.side,
      p.size.toFixed(2),
      p.entryOdds,
      m.yesOdds,
      p.pnl.toFixed(2),
    ].join(",");
  });
  const csv = [header, ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `nullcast-portfolio-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};
