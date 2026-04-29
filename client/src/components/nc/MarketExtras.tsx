"use client";

/**
 * MarketExtras — order book depth, anonymized trade tape, comments, share button.
 * Used inside MarketDetail.
 */
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Share2, Check, MessageSquare, Lock } from "lucide-react";
import { sealed, info } from "@/lib/notify";
import type { Market } from "@/data/markets";

/** Synthetic order book derived from the market's YES odds and pool. */
const makeBook = (m: Market) => {
  const mid = m.yesOdds;
  const bids = Array.from({ length: 8 }, (_, i) => {
    const price = mid - i - 1;
    const size = Math.round((m.pool / 5000) * (1 + Math.random()) * (8 - i) / 4);
    return { price, size };
  });
  const asks = Array.from({ length: 8 }, (_, i) => {
    const price = mid + i + 1;
    const size = Math.round((m.pool / 5000) * (1 + Math.random()) * (8 - i) / 4);
    return { price, size };
  });
  return { bids, asks };
};

export const OrderBook = ({ m }: { m: Market }) => {
  const { bids, asks } = makeBook(m);
  const maxSize = Math.max(...bids.map((b) => b.size), ...asks.map((a) => a.size));

  return (
    <div>
      <div className="flex items-end justify-between mb-4">
        <h2 className="font-display text-xl text-fg">Depth · sealed sizes</h2>
        <span className="font-mono text-[10px] uppercase tracking-wider text-fg-3 flex items-center gap-1.5">
          <Lock className="h-3 w-3" /> bands only
        </span>
      </div>
      <div className="border border-subtle rounded overflow-hidden">
        <div className="grid grid-cols-2 divide-x divide-[hsl(var(--border)/0.06)]">
          {/* Bids — YES */}
          <div>
            <div className="px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-yes border-b border-subtle bg-yes/[0.04]">
              YES bids
            </div>
            {bids.map((b, i) => (
              <DepthRow key={i} side="bid" price={b.price} size={b.size} max={maxSize} />
            ))}
          </div>
          {/* Asks — NO */}
          <div>
            <div className="px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-no border-b border-subtle bg-no/[0.04]">
              NO bids
            </div>
            {asks.map((a, i) => (
              <DepthRow key={i} side="ask" price={a.price} size={a.size} max={maxSize} />
            ))}
          </div>
        </div>
        <div className="px-3 py-2 font-mono text-[10px] text-fg-3 text-center border-t border-subtle bg-surface-1/40">
          mid <span className="text-fg tnum">{m.yesOdds}%</span> · spread <span className="text-fg-2 tnum">2pts</span>
        </div>
      </div>
    </div>
  );
};

const DepthRow = ({ side, price, size, max }: { side: "bid" | "ask"; price: number; size: number; max: number }) => {
  const w = (size / max) * 100;
  const color = side === "bid" ? "hsl(var(--yes) / 0.10)" : "hsl(var(--no) / 0.10)";
  const text  = side === "bid" ? "text-yes" : "text-no";
  return (
    <div className="relative flex items-center justify-between px-3 py-1.5 text-xs font-mono">
      <div
        className="absolute inset-y-0 right-0"
        style={{ width: `${w}%`, background: color }}
        aria-hidden
      />
      <span className={`${text} relative tnum`}>{price}%</span>
      <span className="text-fg-3 relative tnum">●●●●</span>
    </div>
  );
};

/** Anonymized streaming tape — fake recent trades with sealed sizes. */
export const TradeTape = ({ m }: { m: Market }) => {
  const rows = Array.from({ length: 10 }, () => ({
    side: Math.random() > 0.4 ? "YES" : "NO",
    price: m.yesOdds + Math.round((Math.random() - 0.5) * 6),
    seal: ["●●●", "●●●●", "●●●●●", "●●●●●●"][Math.floor(Math.random() * 4)],
    who: `0x${Math.random().toString(16).slice(2, 4)}…${Math.random().toString(16).slice(2, 5)}`,
    ago: `${Math.floor(Math.random() * 60) + 1}s`,
  }));

  return (
    <div>
      <div className="flex items-end justify-between mb-4">
        <h2 className="font-display text-xl text-fg">Tape</h2>
        <span className="font-mono text-[10px] uppercase tracking-wider text-fg-3 flex items-center gap-1.5">
          <span className="live-dot" /> sealed sizes
        </span>
      </div>
      <div className="border border-subtle rounded divide-y divide-[hsl(var(--border)/0.06)] overflow-hidden">
        <div className="grid grid-cols-12 gap-3 px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-fg-3 bg-surface-1/40">
          <div className="col-span-1">Side</div>
          <div className="col-span-2">Price</div>
          <div className="col-span-3">Size</div>
          <div className="col-span-4">Trader</div>
          <div className="col-span-2 text-right">Ago</div>
        </div>
        {rows.map((r, i) => (
          <div
            key={i}
            className="grid grid-cols-12 gap-3 px-3 py-2 items-center text-xs animate-fade-in"
            style={{ animationDelay: `${i * 30}ms` }}
          >
            <span className={`col-span-1 font-mono ${r.side === "YES" ? "text-yes" : "text-no"}`}>{r.side}</span>
            <span className="col-span-2 font-mono tnum text-fg-2">{r.price}%</span>
            <span className="col-span-3 font-mono text-fg-4 tracking-tight">{r.seal}</span>
            <span className="col-span-4 font-mono text-fg-3 truncate">{r.who}</span>
            <span className="col-span-2 font-mono text-fg-3 text-right">{r.ago}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

/** Discussion thread with mock seeded comments + add comment composer. */
interface Comment {
  id: string;
  who: string;
  body: string;
  ts: number;
}

const SEED: Comment[] = [
  { id: "c1", who: "0x4a…91f", body: "On-chain flows quiet today, leaning sideways into close.",         ts: Date.now() - 1000 * 60 * 12 },
  { id: "c2", who: "0xc8…03e", body: "Oracle latency was nasty last week — keep min-bet small.",          ts: Date.now() - 1000 * 60 * 60 * 2 },
  { id: "c3", who: "0x77…be1", body: "Loaded YES at 54%. Anyone else seeing the macro tailwind?",         ts: Date.now() - 1000 * 60 * 60 * 6 },
];

const relTime = (ts: number) => {
  const s = Math.max(1, Math.floor((Date.now() - ts) / 1000));
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
};

export const Discussion = () => {
  const [comments, setComments] = useState<Comment[]>(SEED);
  const [draft, setDraft] = useState("");

  const post = () => {
    const text = draft.trim();
    if (!text) return;
    setComments((c) => [{ id: crypto.randomUUID(), who: "0x7a…e19", body: text, ts: Date.now() }, ...c]);
    setDraft("");
    info("Posted to the table.");
  };

  return (
    <div>
      <div className="flex items-end justify-between mb-4">
        <h2 className="font-display text-xl text-fg flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-fg-3" /> Discussion
          <span className="font-mono text-xs text-fg-3 ml-1">{comments.length}</span>
        </h2>
        <span className="font-mono text-[10px] uppercase tracking-wider text-fg-3">addresses pseudonymous</span>
      </div>

      <div className="border border-subtle rounded p-3 sm:p-4 space-y-2 bg-surface-1/40 mb-4">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Say something at the table…"
          className="bg-transparent border-0 text-sm focus-visible:ring-0 px-0 [&]:text-fg"
        />
        <div className="flex items-center justify-between border-t border-subtle pt-2">
          <span className="font-mono text-[10px] uppercase tracking-wider text-fg-4">{draft.length}/280</span>
          <Button size="sm" variant="primary" onClick={post} disabled={!draft.trim()}>Post</Button>
        </div>
      </div>

      <div className="border border-subtle rounded divide-y divide-[hsl(var(--border)/0.06)] overflow-hidden">
        {comments.map((c) => (
          <div key={c.id} className="px-3 sm:px-4 py-3">
            <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-fg-3">
              <span className="text-fg-2">{c.who}</span>
              <span className="text-fg-4">·</span>
              <span>{relTime(c.ts)} ago</span>
            </div>
            <p className="mt-1.5 text-sm text-fg-2 font-display leading-relaxed">{c.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

/** Compact share button — copies link, shows confirmation. */
export const ShareButton = ({ marketId, question }: { marketId: string; question: string }) => {
  const [copied, setCopied] = useState(false);

  const share = async () => {
    const url = `${window.location.origin}/markets/${marketId}`;
    if (navigator.share) {
      try { await navigator.share({ url, title: "NullCast", text: question }); return; } catch { /* fall through */ }
    }
    try { await navigator.clipboard.writeText(url); } catch { /* ignore */ }
    setCopied(true);
    sealed("Link copied", { hash: url.split("/").pop() ?? "" });
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <button
      onClick={share}
      className="inline-flex items-center gap-1.5 px-2.5 h-7 rounded border border-subtle hover:border-strong text-xs font-mono text-fg-3 hover:text-fg transition-colors"
      aria-label="Share market"
    >
      {copied ? <Check className="h-3 w-3 text-yes" /> : <Share2 className="h-3 w-3" />}
      {copied ? "Copied" : "Share"}
    </button>
  );
};
