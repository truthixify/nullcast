"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from "@/components/ui/command";
import { useFactoryMarkets } from "@/hooks/useFactory";
import { useMarket } from "@/hooks/useMarket";
import { LayoutGrid, Wallet, Coins, Trophy, Droplets, BarChart3, Plus, Search as SearchIcon, Settings } from "lucide-react";

function MarketCommandItem({ address, index, onSelect }: { address: `0x${string}`; index: number; onSelect: (path: string) => void }) {
  const { question } = useMarket(address);
  if (!question) return null;
  return (
    <CommandItem value={question} onSelect={() => onSelect(`/markets/${index}`)}>
      <span className="font-display">{question}</span>
    </CommandItem>
  );
}

export const CommandPalette = () => {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { allMarkets } = useFactoryMarkets();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const go = (path: string) => { setOpen(false); router.push(path); };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search markets, jump anywhere…" />
      <CommandList>
        <CommandEmpty>No results.</CommandEmpty>
        <CommandGroup heading="Pages">
          <CommandItem onSelect={() => go("/markets")}><LayoutGrid /> Markets</CommandItem>
          <CommandItem onSelect={() => go("/portfolio")}><Wallet /> Portfolio</CommandItem>
          <CommandItem onSelect={() => go("/vaults")}><Coins /> Vaults</CommandItem>
          <CommandItem onSelect={() => go("/reputation")}><Trophy /> Score</CommandItem>
          <CommandItem onSelect={() => go("/liquidity")}><Droplets /> Liquidity</CommandItem>
          <CommandItem onSelect={() => go("/activity")}><BarChart3 /> Activity</CommandItem>
          <CommandItem onSelect={() => go("/search")}><SearchIcon /> Search</CommandItem>
          <CommandItem onSelect={() => go("/settings")}><Settings /> Settings</CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Actions">
          <CommandItem onSelect={() => go("/markets/create")}><Plus /> Create market</CommandItem>
        </CommandGroup>
        {allMarkets.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Markets">
              {allMarkets.map((addr, i) => (
                <MarketCommandItem key={addr} address={addr} index={i} onSelect={go} />
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
};
