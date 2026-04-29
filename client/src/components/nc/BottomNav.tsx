"use client";

/**
 * Mobile bottom tab bar. Hidden on lg+. Sits above the TickerRail.
 */
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, Wallet, Plus, Coins, MoreHorizontal } from "lucide-react";
import { useState } from "react";
import { Sheet, SheetContent } from "@/components/ui/sheet";

const TABS = [
  { to: "/markets",   label: "Markets",   icon: LayoutGrid },
  { to: "/portfolio", label: "Portfolio", icon: Wallet },
];
const TAB_R = [
  { to: "/vaults",    label: "Vaults",    icon: Coins },
];
const MORE = [
  { to: "/liquidity", label: "Liquidity" },
  { to: "/score",     label: "Score" },
  { to: "/activity",  label: "Activity" },
  { to: "/search",    label: "Search" },
  { to: "/settings",  label: "Settings" },
];

export const BottomNav = () => {
  const [moreOpen, setMoreOpen] = useState(false);
  const pathname = usePathname();

  return (
    <>
      <nav
        className="lg:hidden fixed bottom-9 inset-x-0 z-30 border-t border-subtle bg-background/95 backdrop-blur-xl pb-[env(safe-area-inset-bottom)]"
        aria-label="Primary"
      >
        <div className="grid grid-cols-5 h-14">
          {TABS.map((t) => (
            <Tab key={t.to} {...t} pathname={pathname} />
          ))}

          <Link
            href="/markets/create"
            aria-label="New market"
            className="flex items-center justify-center"
          >
            <span
              className={`h-10 w-10 rounded-full flex items-center justify-center transition-all ${
                pathname === "/markets/create"
                  ? "bg-primary text-primary-foreground shadow-[0_0_20px_hsl(var(--primary)/0.5)]"
                  : "bg-primary/90 text-primary-foreground hover:bg-primary"
              }`}
            >
              <Plus className="h-5 w-5" />
            </span>
          </Link>

          {TAB_R.map((t) => (
            <Tab key={t.to} {...t} pathname={pathname} />
          ))}

          <button
            onClick={() => setMoreOpen(true)}
            className="flex flex-col items-center justify-center gap-0.5 text-fg-3 hover:text-fg-2 transition-colors"
            aria-label="More"
          >
            <MoreHorizontal className="h-4 w-4" />
            <span className="font-mono text-[10px] uppercase tracking-wider">More</span>
          </button>
        </div>
      </nav>

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="bottom" className="bg-background border-t border-subtle">
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-fg-3 mb-3">More</div>
          <div className="grid grid-cols-2 gap-2">
            {MORE.map((m) => (
              <Link
                key={m.to}
                href={m.to}
                onClick={() => setMoreOpen(false)}
                className="px-4 py-3 rounded border border-subtle text-sm text-fg-2 hover:text-fg hover:border-strong transition-colors"
              >
                {m.label}
              </Link>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};

const Tab = ({ to, label, icon: Icon, pathname }: { to: string; label: string; icon: React.ElementType; pathname: string }) => (
  <Link
    href={to}
    className={`flex flex-col items-center justify-center gap-0.5 transition-colors ${
      pathname === to ? "text-primary" : "text-fg-3 hover:text-fg-2"
    }`}
  >
    <Icon className="h-4 w-4" />
    <span className="font-mono text-[10px] uppercase tracking-wider">{label}</span>
  </Link>
);
