"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { BrandMark, FHEBadge } from "./Icons";

const navItems = [
  { href: "/markets", label: "Markets" },
  { href: "/portfolio", label: "Portfolio" },
  { href: "/liquidity", label: "Liquidity" },
  { href: "/reputation", label: "Score" },
];

export function Header() {
  const path = usePathname();

  return (
    <>
      {/* Desktop header */}
      <header className="site-header">
        <div className="container row">
          <Link href="/" className="brand">
            <span className="mark" style={{ color: "var(--acc)" }}>
              <BrandMark />
            </span>
            <span>nullcast</span>
          </Link>
          <nav className="nav">
            {navItems.map((n) => (
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
          <ConnectButton />
        </div>
      </header>

      {/* Mobile bottom tab bar — hidden on desktop via CSS */}
      <nav className="mobile-nav" style={{ display: "none" }}>
        {navItems.map((n) => (
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
