"use client";

import React from "react";
import { useFactoryMarkets } from "@/hooks/useFactory";
import { useMarket } from "@/hooks/useMarket";
import { EmptyState } from "@/components/nc/EmptyState";

function ActivityRow({ address, index }: { address: `0x${string}`; index: number }) {
  const { question } = useMarket(address);
  if (!question) return null;

  return (
    <div className="flex items-center gap-3 sm:gap-4 px-3 sm:px-4 py-2.5 text-xs border-b border-subtle hover:bg-surface-2/40 transition-colors">
      <span className="h-1.5 w-1.5 rounded-full bg-yes shrink-0" />
      <span className="font-display text-fg truncate flex-1">{question}</span>
      <span className="font-mono text-fg-4">●●●●●●</span>
      <span className="font-mono text-fg-3 text-[10px] uppercase tracking-wider">Market #{index}</span>
    </div>
  );
}

export default function ActivityPage() {
  const { allMarkets, isLoading } = useFactoryMarkets();

  if (isLoading) {
    return (
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-8 sm:py-10">
        <div className="py-16 text-center text-fg-3 text-sm">Loading activity...</div>
      </div>
    );
  }

  if (allMarkets.length === 0) {
    return (
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-10">
        <EmptyState
          title="The table is quiet"
          body="No markets created yet. Activity will appear here once markets are live."
        />
      </div>
    );
  }

  return (
    <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-8 sm:py-10">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8 sm:mb-10">
        <div>
          <span className="section-numeral text-xl sm:text-2xl">§ Activity</span>
          <h1 className="font-display text-3xl sm:text-4xl text-fg mt-1">The table speaks</h1>
          <p className="mt-2 text-fg-3 font-display max-w-xl text-sm sm:text-base">
            Every encrypted bet, every settlement — streaming live from the chain.
          </p>
        </div>
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-fg-3 flex items-center gap-2 shrink-0">
          <span className="live-dot" /> Live · on-chain
        </span>
      </div>

      <div className="border border-subtle rounded overflow-hidden">
        <div className="grid grid-cols-12 gap-4 px-4 py-2.5 font-mono text-[10px] uppercase tracking-wider text-fg-3 border-b border-subtle bg-surface-1/40">
          <div className="col-span-1">Status</div>
          <div className="col-span-8">Market</div>
          <div className="col-span-1">Amount</div>
          <div className="col-span-2 text-right">ID</div>
        </div>
        <div>
          {allMarkets.map((addr, i) => (
            <ActivityRow key={addr} address={addr} index={i} />
          ))}
        </div>
      </div>
    </div>
  );
}
