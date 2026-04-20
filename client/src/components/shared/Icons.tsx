"use client";

import React from "react";

/* ================================================================
   Icon — renders inline SVGs by name
   ================================================================ */

export function Icon({ name, size = 16, color = "currentColor" }: { name: string; size?: number; color?: string }) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: color,
    strokeWidth: 1.5,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  switch (name) {
    case "home":
      return <svg {...common}><path d="M3 11 12 4l9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1v-9Z" /></svg>;
    case "markets":
      return <svg {...common}><path d="M3 18V8m6 10V4m6 14v-7m6 7v-10" /></svg>;
    case "portfolio":
      return <svg {...common}><path d="M3 7h18v12H3z" /><path d="M3 7V5a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2" /></svg>;
    case "vaults":
      return <svg {...common}><rect x="3" y="5" width="18" height="14" rx="1" /><circle cx="12" cy="12" r="3.5" /><path d="M12 8.5v-1M12 16.5v-1M8.5 12h-1M16.5 12h-1" /></svg>;
    case "score":
      return <svg {...common}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>;
    case "liquidity":
      return <svg {...common}><path d="M12 3c4 5 6 8.5 6 11.5A6 6 0 0 1 6 14.5C6 11.5 8 8 12 3Z" /></svg>;
    case "search":
      return <svg {...common}><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>;
    case "arrow-right":
      return <svg {...common}><path d="M5 12h14M13 5l7 7-7 7" /></svg>;
    case "arrow-up":
      return <svg {...common}><path d="M12 19V5M5 12l7-7 7 7" /></svg>;
    case "arrow-down":
      return <svg {...common}><path d="M12 5v14M5 12l7 7 7-7" /></svg>;
    case "check":
      return <svg {...common}><path d="M5 12l5 5L20 7" /></svg>;
    case "x":
      return <svg {...common}><path d="M6 6l12 12M18 6 6 18" /></svg>;
    case "eye":
      return <svg {...common}><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></svg>;
    case "plus":
      return <svg {...common}><path d="M12 5v14M5 12h14" /></svg>;
    case "lock":
      return (
        <svg viewBox="0 0 16 16" width={size} height={size} fill="none" stroke={color} strokeWidth={1.5}>
          <rect x="3" y="7" width="10" height="7" rx="1.5" />
          <path d="M5 7V5a3 3 0 016 0v2" />
        </svg>
      );
    case "lock-open":
      return (
        <svg viewBox="0 0 16 16" width={size} height={size} fill="none" stroke={color} strokeWidth={1.5}>
          <rect x="3" y="7" width="10" height="7" rx="1.5" />
          <path d="M5 7V5a3 3 0 016 0" />
        </svg>
      );
    case "chevron-down":
      return <svg {...common}><path d="M6 9l6 6 6-6" /></svg>;
    case "chevron-up":
      return <svg {...common}><path d="M6 15l6-6 6 6" /></svg>;
    case "chevron-left":
      return <svg {...common}><path d="M15 18l-6-6 6-6" /></svg>;
    case "chevron-right":
      return <svg {...common}><path d="M9 18l6-6-6-6" /></svg>;
    case "copy":
      return (
        <svg {...common}>
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
      );
    case "external":
      return (
        <svg {...common}>
          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3" />
        </svg>
      );
    case "refresh":
      return (
        <svg viewBox="0 0 16 16" width={size} height={size} fill="none" stroke={color} strokeWidth={1.5}>
          <path d="M2.5 8a5.5 5.5 0 019.3-4M13.5 8a5.5 5.5 0 01-9.3 4" />
          <path d="M12 1v3h-3M4 12v3h3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "shield":
      return <svg {...common}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" /></svg>;
    case "wallet":
      return <svg {...common}><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4M3 5v14a2 2 0 0 0 2 2h16v-5M18 12a1 1 0 1 0 0 2 1 1 0 0 0 0-2Z" /></svg>;
    case "clock":
      return <svg {...common}><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>;
    case "info":
      return <svg {...common}><circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" /></svg>;
    case "bolt":
      return <svg {...common}><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8Z" /></svg>;
    case "chart":
      return <svg {...common}><path d="M18 20V10M12 20V4M6 20v-6" /></svg>;
    default:
      return null;
  }
}

/* ================================================================
   NullCastMark — logo mark
   ================================================================ */

export function NullCastMark() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke="var(--ink-3)" strokeWidth="1" />
      <circle cx="12" cy="12" r="5.5" stroke="var(--gold)" strokeWidth="1.2" />
      <circle cx="12" cy="12" r="2" fill="var(--gold)" />
    </svg>
  );
}

/* ================================================================
   Backward-compatible named exports
   ================================================================ */

export const LockIcon = (p: { size?: number; stroke?: string; sw?: number; style?: React.CSSProperties }) => (
  <Icon name="lock" size={p.size || 12} color={p.stroke || "currentColor"} />
);

export const LockOpenIcon = (p: { size?: number }) => (
  <Icon name="lock-open" size={p.size || 12} />
);

export const SearchIcon = (p: { size?: number }) => (
  <Icon name="search" size={p.size || 12} />
);

export const ChevronIcon = (p: { size?: number; direction?: "up" | "down" | "left" | "right" }) => {
  const d = p.direction || "down";
  const nameMap: Record<string, string> = {
    down: "chevron-down",
    up: "chevron-up",
    left: "chevron-left",
    right: "chevron-right",
  };
  return <Icon name={nameMap[d]} size={p.size || 12} />;
};

export const PlusIcon = (p: { size?: number }) => (
  <Icon name="plus" size={p.size || 12} />
);

export const CheckIcon = (p: { size?: number }) => (
  <Icon name="check" size={p.size || 12} />
);

export const CopyIcon = (p: { size?: number }) => (
  <Icon name="copy" size={p.size || 12} />
);

export const ExternalIcon = (p: { size?: number }) => (
  <Icon name="external" size={p.size || 12} />
);

export const RefreshIcon = (p: { size?: number }) => (
  <Icon name="refresh" size={p.size || 12} />
);

export const ArrowUpIcon = (p: { size?: number }) => (
  <Icon name="arrow-up" size={p.size || 12} />
);

export const ArrowDownIcon = (p: { size?: number }) => (
  <Icon name="arrow-down" size={p.size || 12} />
);

/* ================================================================
   BrandMark — backward-compatible alias using NullCastMark
   ================================================================ */

export const BrandMark = ({ size = 22 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="9" stroke="var(--ink-3)" strokeWidth="1" />
    <circle cx="12" cy="12" r="5.5" stroke="var(--gold)" strokeWidth="1.2" />
    <circle cx="12" cy="12" r="2" fill="var(--gold)" />
  </svg>
);

/* ================================================================
   Pill & FHEBadge
   ================================================================ */

export const Pill = ({
  children,
  variant = "",
  className = "",
  live,
}: {
  children: React.ReactNode;
  variant?: string;
  className?: string;
  live?: boolean;
}) => (
  <span className={`pill ${variant} ${className}`}>
    {live && <span className="dot-live" />}
    {children}
  </span>
);

export const FHEBadge = ({ children = "FHE" }: { children?: React.ReactNode }) => (
  <span className="pill enc">
    <LockIcon size={10} /> {children}
  </span>
);

/* ================================================================
   Backward-compatible Icon* aliases
   ================================================================ */

export const IconSearch = (p: { size?: number; stroke?: string; sw?: number; style?: React.CSSProperties }) => (
  <span style={{ flexShrink: 0, display: "inline-flex", ...p.style }}>
    <Icon name="search" size={p.size || 16} color={p.stroke || "currentColor"} />
  </span>
);

export const IconPlus = (p: { size?: number; stroke?: string; sw?: number; style?: React.CSSProperties }) => (
  <span style={{ flexShrink: 0, display: "inline-flex", ...p.style }}>
    <Icon name="plus" size={p.size || 16} color={p.stroke || "currentColor"} />
  </span>
);

export const IconArrowRight = (p: { size?: number; stroke?: string; sw?: number; style?: React.CSSProperties }) => (
  <span style={{ flexShrink: 0, display: "inline-flex", ...p.style }}>
    <Icon name="arrow-right" size={p.size || 16} color={p.stroke || "currentColor"} />
  </span>
);

export const IconChart = (p: { size?: number; stroke?: string; sw?: number; style?: React.CSSProperties }) => (
  <span style={{ flexShrink: 0, display: "inline-flex", ...p.style }}>
    <Icon name="chart" size={p.size || 16} color={p.stroke || "currentColor"} />
  </span>
);

export const IconShield = (p: { size?: number; stroke?: string; sw?: number; style?: React.CSSProperties }) => (
  <span style={{ flexShrink: 0, display: "inline-flex", ...p.style }}>
    <Icon name="shield" size={p.size || 16} color={p.stroke || "currentColor"} />
  </span>
);

export const IconChevronRight = (p: { size?: number; stroke?: string; sw?: number; style?: React.CSSProperties }) => (
  <span style={{ flexShrink: 0, display: "inline-flex", ...p.style }}>
    <Icon name="chevron-right" size={p.size || 16} color={p.stroke || "currentColor"} />
  </span>
);

export const IconChevronLeft = (p: { size?: number; stroke?: string; sw?: number; style?: React.CSSProperties }) => (
  <span style={{ flexShrink: 0, display: "inline-flex", ...p.style }}>
    <Icon name="chevron-left" size={p.size || 16} color={p.stroke || "currentColor"} />
  </span>
);

export const IconCheck = (p: { size?: number; stroke?: string; sw?: number; style?: React.CSSProperties }) => (
  <span style={{ flexShrink: 0, display: "inline-flex", ...p.style }}>
    <Icon name="check" size={p.size || 16} color={p.stroke || "currentColor"} />
  </span>
);

export const IconWallet = (p: { size?: number; stroke?: string; sw?: number; style?: React.CSSProperties }) => (
  <span style={{ flexShrink: 0, display: "inline-flex", ...p.style }}>
    <Icon name="wallet" size={p.size || 16} color={p.stroke || "currentColor"} />
  </span>
);

export const IconClock = (p: { size?: number; stroke?: string; sw?: number; style?: React.CSSProperties }) => (
  <span style={{ flexShrink: 0, display: "inline-flex", ...p.style }}>
    <Icon name="clock" size={p.size || 16} color={p.stroke || "currentColor"} />
  </span>
);

export const IconInfo = (p: { size?: number; stroke?: string; sw?: number; style?: React.CSSProperties }) => (
  <span style={{ flexShrink: 0, display: "inline-flex", ...p.style }}>
    <Icon name="info" size={p.size || 16} color={p.stroke || "currentColor"} />
  </span>
);

export const IconExternal = (p: { size?: number; stroke?: string; sw?: number; style?: React.CSSProperties }) => (
  <span style={{ flexShrink: 0, display: "inline-flex", ...p.style }}>
    <Icon name="external" size={p.size || 16} color={p.stroke || "currentColor"} />
  </span>
);

export const IconBolt = (p: { size?: number; stroke?: string; sw?: number; style?: React.CSSProperties }) => (
  <span style={{ flexShrink: 0, display: "inline-flex", ...p.style }}>
    <Icon name="bolt" size={p.size || 16} color={p.stroke || "currentColor"} />
  </span>
);

export const IconCopy = (p: { size?: number; stroke?: string; sw?: number; style?: React.CSSProperties }) => (
  <span style={{ flexShrink: 0, display: "inline-flex", ...p.style }}>
    <Icon name="copy" size={p.size || 16} color={p.stroke || "currentColor"} />
  </span>
);

/* LogoFull — backward compat for landing page */
export const LogoFull = ({ size = 28 }: { size?: number }) => (
  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
    <NullCastMark />
    <span
      className="serif"
      style={{
        fontSize: size * 0.65,
        fontWeight: 500,
        letterSpacing: "-0.01em",
        color: "var(--ink-1)",
      }}
    >
      NullCast
    </span>
  </div>
);
