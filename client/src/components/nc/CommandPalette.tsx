"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from "@/components/ui/command";
import { MARKETS } from "@/data/markets";
import { useWallet } from "@/lib/wallet";
import { LayoutGrid, Wallet, Coins, Trophy, Droplets, BarChart3, Plus, Search as SearchIcon, Settings, Bell, ArrowDownLeft, ArrowUpRight } from "lucide-react";

export const CommandPalette = () => {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const wallet = useWallet();

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
  const act = (fn: () => void) => { setOpen(false); fn(); };

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
          <CommandItem onSelect={() => act(() => wallet.openWallet("deposit"))}><ArrowDownLeft /> Deposit</CommandItem>
          <CommandItem onSelect={() => act(() => wallet.openWallet("withdraw"))}><ArrowUpRight /> Withdraw</CommandItem>
          <CommandItem onSelect={() => act(() => window.dispatchEvent(new KeyboardEvent("keydown", { key: "?" })))}>
            <Bell /> Show keyboard shortcuts
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Markets">
          {MARKETS.map((m) => (
            <CommandItem key={m.id} value={m.question} onSelect={() => go(`/markets/${m.id}`)}>
              <span className="font-display">{m.question}</span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
};
