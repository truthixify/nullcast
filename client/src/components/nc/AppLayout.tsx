"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CommandPalette } from "@/components/nc/CommandPalette";
import { Logo } from "@/components/nc/Logo";
import { TickerRail } from "@/components/nc/TickerRail";
import { PnLDock } from "@/components/nc/PnLDock";
import { WalletDrawer } from "@/components/nc/WalletDrawer";
import { NotificationsBell } from "@/components/nc/NotificationsBell";
import { BottomNav } from "@/components/nc/BottomNav";
import { ShortcutsModal } from "@/components/nc/ShortcutsModal";
import { Onboarding } from "@/components/nc/Onboarding";
import { useWallet } from "@/lib/wallet";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Menu, Search, Plus, Settings as SettingsIcon } from "lucide-react";

const NAV = [
  { to: "/markets",   label: "Markets" },
  { to: "/portfolio", label: "Portfolio" },
  { to: "/vaults",    label: "Vaults" },
  { to: "/liquidity", label: "Liquidity" },
  { to: "/score",     label: "Score" },
  { to: "/activity",  label: "Activity" },
];

export const AppLayout = ({ children }: { children: ReactNode }) => {
  const pathname = usePathname();
  const wallet = useWallet();
  const [navOpen, setNavOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <CommandPalette />
      <WalletDrawer />
      <ShortcutsModal />
      <Onboarding />

      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-subtle bg-background/85 backdrop-blur-xl">
        <div className="max-w-[1280px] mx-auto h-14 px-4 sm:px-6 flex items-center gap-3 sm:gap-8">
          {/* Mobile menu */}
          <button
            onClick={() => setNavOpen(true)}
            className="lg:hidden h-9 w-9 -ml-2 inline-flex items-center justify-center text-fg-2 hover:text-fg transition-colors"
            aria-label="Open navigation menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          <Link href="/" className="group flex items-center gap-2.5 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring rounded">
            <Logo mark size={22} className="transition-transform group-hover:rotate-[8deg]" />
            <span className="font-display text-base sm:text-lg tracking-tight leading-none">
              null<span className="italic text-primary">cast</span>
            </span>
          </Link>

          <nav className="hidden lg:flex items-center gap-6 text-sm" aria-label="Primary">
            {NAV.slice(0, 5).map((n) => (
              <Link
                key={n.to}
                href={n.to}
                className={`transition-colors focus-visible:outline-none focus-visible:text-fg ${pathname === n.to || pathname?.startsWith(n.to + "/") ? "text-fg" : "text-fg-3 hover:text-fg-2"}`}
              >
                {n.label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <Link
              href="/markets/create"
              className="hidden md:inline-flex items-center gap-1.5 px-2.5 h-8 rounded border border-subtle hover:border-strong text-xs text-fg-2 hover:text-fg transition-colors"
            >
              <Plus className="h-3 w-3" /> New market
            </Link>

            <button
              onClick={() => window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }))}
              className="inline-flex items-center gap-2 px-2 sm:px-2.5 h-8 rounded border border-subtle hover:border-strong text-xs text-fg-3 hover:text-fg-2 transition-colors"
              aria-label="Search · ⌘K"
            >
              <Search className="h-3 w-3" />
              <span className="hidden sm:inline">Search</span>
              <kbd className="hidden md:inline font-mono text-[10px] px-1.5 py-0.5 rounded bg-surface-2 border border-subtle">⌘K</kbd>
            </button>

            <NotificationsBell />

            <Link
              href="/settings"
              className="hidden sm:inline-flex h-8 w-8 items-center justify-center rounded border border-subtle hover:border-strong text-fg-3 hover:text-fg transition-colors"
              aria-label="Settings"
            >
              <SettingsIcon className="h-3.5 w-3.5" />
            </Link>

            <button
              onClick={() => wallet.openWallet("deposit")}
              className="flex items-center gap-2 h-8 px-2.5 sm:px-3 rounded bg-surface-2 border border-subtle hover:border-strong transition-colors text-xs"
              aria-label={`Wallet · ${wallet.balance.toFixed(0)} cUSDT`}
            >
              <span className="font-mono text-fg-2 hidden sm:inline">{wallet.address}</span>
              <span className="font-mono text-primary tnum">
                {wallet.balance.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile nav drawer */}
      <Sheet open={navOpen} onOpenChange={setNavOpen}>
        <SheetContent side="left" className="w-[80%] max-w-xs bg-background border-r border-subtle p-0">
          <div className="p-5 border-b border-subtle flex items-center gap-2.5">
            <Logo mark size={20} />
            <span className="font-display text-lg tracking-tight">
              null<span className="italic text-primary">cast</span>
            </span>
          </div>
          <nav className="flex flex-col p-2" aria-label="Mobile primary">
            {NAV.map((n) => (
              <Link
                key={n.to}
                href={n.to}
                onClick={() => setNavOpen(false)}
                className={`px-4 py-3 rounded text-sm transition-colors ${
                  pathname === n.to || pathname?.startsWith(n.to + "/") ? "bg-surface-2 text-fg" : "text-fg-3 hover:text-fg-2 hover:bg-surface-1"
                }`}
              >
                {n.label}
              </Link>
            ))}
            <Link
              href="/search"
              onClick={() => setNavOpen(false)}
              className="px-4 py-3 rounded text-sm text-fg-3 hover:text-fg-2 hover:bg-surface-1 transition-colors"
            >
              Search
            </Link>
            <Link
              href="/settings"
              onClick={() => setNavOpen(false)}
              className="px-4 py-3 rounded text-sm text-fg-3 hover:text-fg-2 hover:bg-surface-1 transition-colors"
            >
              Settings
            </Link>
            <Link
              href="/markets/create"
              onClick={() => setNavOpen(false)}
              className="px-4 py-3 rounded text-sm text-primary hover:bg-surface-2 transition-colors mt-2 border-t border-subtle"
            >
              + New market
            </Link>
          </nav>
        </SheetContent>
      </Sheet>

      <main key={pathname} className="flex-1 animate-fade-in pb-32 lg:pb-12" id="main">
        {children}
      </main>

      <PnLDock />
      <BottomNav />
      <TickerRail />

      <footer className="border-t border-subtle py-3">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 flex items-center justify-between text-[11px] text-fg-3 gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <Logo mark size={12} />
            <span className="font-display italic truncate">The house can&apos;t see your cards.</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
