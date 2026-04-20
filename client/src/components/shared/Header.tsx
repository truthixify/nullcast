"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ConnectButton } from "@rainbow-me/rainbowkit";

function WalletButton() {
  return (
    <ConnectButton.Custom>
      {({ account, chain, openAccountModal, openConnectModal, mounted }) => {
        const connected = mounted && account && chain;
        return (
          <button
            onClick={connected ? openAccountModal : openConnectModal}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "8px 12px",
              borderRadius: 4,
              border: "1px solid var(--line-2)",
              background: connected ? "transparent" : "var(--gold)",
              color: connected ? "var(--ink-1)" : "#1A1511",
              fontSize: 12,
              fontFamily: "var(--f-mono)",
              cursor: "pointer",
              transition: "border-color 200ms, background 200ms",
              width: "100%",
            }}
          >
            {connected ? (
              <>
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: "var(--yes)",
                    flexShrink: 0,
                  }}
                />
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {account.displayName}
                </span>
              </>
            ) : (
              <span style={{ fontWeight: 500 }}>Connect</span>
            )}
          </button>
        );
      }}
    </ConnectButton.Custom>
  );
}
import { NullCastMark, Icon, FHEBadge } from "./Icons";
import { PulseDot } from "./PulseDot";

const navItems = [
  { href: "/", label: "Home", icon: "home" },
  { href: "/markets", label: "Markets", icon: "markets" },
  { href: "/portfolio", label: "Portfolio", icon: "portfolio" },
  { href: "/vaults", label: "Vaults", icon: "vaults" },
  { href: "/reputation", label: "Score", icon: "score" },
  { href: "/liquidity", label: "Liquidity", icon: "liquidity" },
];

/* ── Sidebar (desktop) ────────────────────────────────────────── */
export function Sidebar() {
  const path = usePathname();

  const isActive = (href: string) => {
    if (href === "/") return path === "/";
    return path?.startsWith(href) ?? false;
  };

  return (
    <aside className="left-nav">
      {/* Logo */}
      <div className="brand-area">
        <NullCastMark />
        <span className="brand-text">NullCast</span>
      </div>

      {/* Nav items */}
      <nav>
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={isActive(item.href) ? "active" : ""}
          >
            <Icon name={item.icon} size={15} />
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>

      <div style={{ flex: 1 }} />

      {/* Search hint */}
      <div className="search-trigger">
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Icon name="search" size={12} /> Search
        </span>
        <span className="kbd">&#8984;K</span>
      </div>

      {/* Account chip */}
      <div className="account-chip">
        <WalletButton />
      </div>
    </aside>
  );
}

/* ── TopBar (across top of main content) ──────────────────────── */
export function TopBar() {
  return (
    <div className="top-bar">
      <button className="top-bar-search" type="button">
        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Icon name="search" size={12} /> Search markets, addresses...
        </span>
        <span className="kbd">&#8984;K</span>
      </button>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span
          className="mono top-bar-network"
          style={{
            fontSize: 11,
            color: "var(--ink-2)",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <PulseDot color="var(--yes)" />
          <span>Sepolia</span>
        </span>
        <div className="top-bar-wallet">
          <WalletButton />
        </div>
      </div>
    </div>
  );
}

/* ── MobileNav (bottom tab bar) ───────────────────────────────── */
export function MobileNav() {
  const path = usePathname();

  const mobileItems = [
    { href: "/markets", label: "Markets", icon: "markets" },
    { href: "/portfolio", label: "Portfolio", icon: "portfolio" },
    { href: "/vaults", label: "Vaults", icon: "vaults" },
    { href: "/reputation", label: "Score", icon: "score" },
    { href: "/liquidity", label: "Liquidity", icon: "liquidity" },
  ];

  return (
    <nav className="mobile-nav">
      {mobileItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={path?.startsWith(item.href) ? "active" : ""}
        >
          <Icon name={item.icon} size={18} />
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

/* ── Legacy Header (for landing page and backward compat) ─────── */
export function Header() {
  const path = usePathname();

  const headerNavItems = [
    { href: "/markets", label: "Markets" },
    { href: "/portfolio", label: "Portfolio" },
    { href: "/liquidity", label: "Liquidity" },
    { href: "/vaults", label: "Vaults" },
    { href: "/reputation", label: "Score" },
  ];

  return (
    <>
      {/* Desktop header */}
      <header className="site-header">
        <div className="container row">
          <Link href="/" className="brand">
            <span className="mark" style={{ color: "var(--gold)" }}>
              <NullCastMark />
            </span>
            <span>NullCast</span>
          </Link>
          <nav className="nav">
            {headerNavItems.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className={path?.startsWith(n.href) ? "active" : ""}
              >
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="header-spacer" />
          <div className="header-meta">
            <FHEBadge>FHE &middot; Sepolia</FHEBadge>
          </div>
          <WalletButton />
        </div>
      </header>

      {/* Mobile bottom tab bar */}
      <nav className="mobile-nav" style={{ display: "none" }}>
        {headerNavItems.map((n) => (
          <Link
            key={n.href}
            href={n.href}
            className={path?.startsWith(n.href) ? "active" : ""}
          >
            {n.label}
          </Link>
        ))}
      </nav>
    </>
  );
}
