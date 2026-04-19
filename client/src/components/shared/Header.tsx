"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { LogoFull, IconSearch, IconBell } from "@/components/shared/Icons";

const NAV_ITEMS = [
  { label: "Markets", href: "/markets" },
  { label: "Portfolio", href: "/portfolio" },
  { label: "Create", href: "/markets/create" },
  { label: "Reputation", href: "/reputation" },
] as const;

export function Header() {
  const pathname = usePathname();

  return (
    <header className="nc-header">
      <div className="nc-header__inner container">
        {/* Left: Logo + Nav */}
        <div style={{ display: "flex", alignItems: "center", gap: "32px" }}>
          <Link href="/" style={{ textDecoration: "none" }}>
            <LogoFull size={24} />
          </Link>

          <nav style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            {NAV_ITEMS.map((item) => {
              const isActive =
                item.href === "/markets"
                  ? pathname === "/markets" ||
                    (pathname.startsWith("/markets") &&
                      pathname !== "/markets/create")
                  : pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`nc-nav${isActive ? " nc-nav--active" : ""}`}
                  style={{ textDecoration: "none" }}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right: Search + Bell + Connect */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div className="nc-search">
            <IconSearch
              size={14}
              stroke="var(--color-text-tertiary)"
            />
            <input
              type="text"
              placeholder="Search markets..."
              aria-label="Search markets"
            />
            <kbd className="nc-search__kbd">&#8984;K</kbd>
          </div>

          <button
            type="button"
            className="btn btn-ghost"
            style={{ padding: "8px" }}
            aria-label="Notifications"
          >
            <IconBell size={18} stroke="var(--color-text-secondary)" />
          </button>

          <ConnectButton
            showBalance={false}
            chainStatus="icon"
            accountStatus="address"
          />
        </div>
      </div>
    </header>
  );
}
