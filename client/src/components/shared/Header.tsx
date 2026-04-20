"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { BrandMark, FHEBadge } from "./Icons";

export function Header() {
  const path = usePathname();
  const navItems = [
    { href: "/markets", label: "Markets" },
    { href: "/portfolio", label: "Portfolio" },
    { href: "/reputation", label: "Reputation" },
  ];
  return (
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
  );
}
