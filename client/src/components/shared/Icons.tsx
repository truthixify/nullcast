"use client";

import React from "react";

/* ================================================================
   Icon components — each is a simple SVG
   ================================================================ */

export const LockIcon = (p: { size?: number; stroke?: string; sw?: number; style?: React.CSSProperties }) => (
  <svg viewBox="0 0 16 16" width={p.size || 12} height={p.size || 12} fill="none"
    stroke={p.stroke || "currentColor"} strokeWidth={p.sw || 1.5} style={p.style}>
    <rect x="3" y="7" width="10" height="7" rx="1.5" />
    <path d="M5 7V5a3 3 0 016 0v2" />
  </svg>
);

export const LockOpenIcon = (p: { size?: number }) => (
  <svg viewBox="0 0 16 16" width={p.size || 12} height={p.size || 12} fill="none" stroke="currentColor" strokeWidth="1.5">
    <rect x="3" y="7" width="10" height="7" rx="1.5" />
    <path d="M5 7V5a3 3 0 016 0" />
  </svg>
);

export const SearchIcon = (p: { size?: number }) => (
  <svg viewBox="0 0 16 16" width={p.size || 12} height={p.size || 12} fill="none" stroke="currentColor" strokeWidth="1.5">
    <circle cx="7" cy="7" r="4.5" />
    <path d="M10.5 10.5L14 14" />
  </svg>
);

export const ChevronIcon = (p: { size?: number; direction?: "up" | "down" | "left" | "right" }) => {
  const d = p.direction || "down";
  const paths: Record<string, string> = {
    down: "M4 6l4 4 4-4",
    up: "M4 10l4-4 4 4",
    left: "M10 4l-4 4 4 4",
    right: "M6 4l4 4-4 4",
  };
  return (
    <svg viewBox="0 0 16 16" width={p.size || 12} height={p.size || 12} fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d={paths[d]} />
    </svg>
  );
};

export const PlusIcon = (p: { size?: number }) => (
  <svg viewBox="0 0 16 16" width={p.size || 12} height={p.size || 12} fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M8 3v10M3 8h10" />
  </svg>
);

export const CheckIcon = (p: { size?: number }) => (
  <svg viewBox="0 0 16 16" width={p.size || 12} height={p.size || 12} fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M3 8.5l3.5 3.5L13 5" />
  </svg>
);

export const CopyIcon = (p: { size?: number }) => (
  <svg viewBox="0 0 16 16" width={p.size || 12} height={p.size || 12} fill="none" stroke="currentColor" strokeWidth="1.5">
    <rect x="5.5" y="5.5" width="8" height="8" rx="1.5" />
    <path d="M3 10.5V3.5A.5.5 0 013.5 3h7" />
  </svg>
);

export const ExternalIcon = (p: { size?: number }) => (
  <svg viewBox="0 0 16 16" width={p.size || 12} height={p.size || 12} fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M12 9v3.5a1.5 1.5 0 01-1.5 1.5h-7A1.5 1.5 0 012 12.5v-7A1.5 1.5 0 013.5 4H7" />
    <path d="M10 2h4v4M6.5 9.5L14 2" />
  </svg>
);

export const RefreshIcon = (p: { size?: number }) => (
  <svg viewBox="0 0 16 16" width={p.size || 12} height={p.size || 12} fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M2.5 8a5.5 5.5 0 019.3-4M13.5 8a5.5 5.5 0 01-9.3 4" />
    <path d="M12 1v3h-3M4 12v3h3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const ArrowUpIcon = (p: { size?: number }) => (
  <svg viewBox="0 0 16 16" width={p.size || 12} height={p.size || 12} fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M8 13V3M4 7l4-4 4 4" />
  </svg>
);

export const ArrowDownIcon = (p: { size?: number }) => (
  <svg viewBox="0 0 16 16" width={p.size || 12} height={p.size || 12} fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M8 3v10M4 9l4 4 4-4" />
  </svg>
);

/* ================================================================
   BrandMark
   ================================================================ */

export const BrandMark = ({ size = 22 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 22 22" fill="none">
    <rect x="2.5" y="2.5" width="17" height="17" rx="4" stroke="currentColor" strokeWidth="1.3" opacity="0.55" />
    <path d="M5 17L17 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    <circle cx="11" cy="11" r="2.3" fill="currentColor" opacity="0.9" />
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
   Backward-compatible aliases — used by existing pages
   ================================================================ */

export const IconSearch = (p: { size?: number; stroke?: string; sw?: number; style?: React.CSSProperties }) => (
  <svg width={p.size || 16} height={p.size || 16} viewBox="0 0 24 24" fill="none"
    stroke={p.stroke || "currentColor"} strokeWidth={p.sw || 1.5}
    strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, ...p.style }}>
    <path d="M21 21l-4.35-4.35M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z" />
  </svg>
);

export const IconPlus = (p: { size?: number; stroke?: string; sw?: number; style?: React.CSSProperties }) => (
  <svg width={p.size || 16} height={p.size || 16} viewBox="0 0 24 24" fill="none"
    stroke={p.stroke || "currentColor"} strokeWidth={p.sw || 1.5}
    strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, ...p.style }}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export const IconArrowRight = (p: { size?: number; stroke?: string; sw?: number; style?: React.CSSProperties }) => (
  <svg width={p.size || 16} height={p.size || 16} viewBox="0 0 24 24" fill="none"
    stroke={p.stroke || "currentColor"} strokeWidth={p.sw || 1.5}
    strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, ...p.style }}>
    <path d="M5 12h14M12 5l7 7-7 7" />
  </svg>
);

export const IconChart = (p: { size?: number; stroke?: string; sw?: number; style?: React.CSSProperties }) => (
  <svg width={p.size || 16} height={p.size || 16} viewBox="0 0 24 24" fill="none"
    stroke={p.stroke || "currentColor"} strokeWidth={p.sw || 1.5}
    strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, ...p.style }}>
    <path d="M18 20V10M12 20V4M6 20v-6" />
  </svg>
);

export const IconShield = (p: { size?: number; stroke?: string; sw?: number; style?: React.CSSProperties }) => (
  <svg width={p.size || 16} height={p.size || 16} viewBox="0 0 24 24" fill="none"
    stroke={p.stroke || "currentColor"} strokeWidth={p.sw || 1.5}
    strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, ...p.style }}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
  </svg>
);

export const IconChevronRight = (p: { size?: number; stroke?: string; sw?: number; style?: React.CSSProperties }) => (
  <svg width={p.size || 16} height={p.size || 16} viewBox="0 0 24 24" fill="none"
    stroke={p.stroke || "currentColor"} strokeWidth={p.sw || 1.5}
    strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, ...p.style }}>
    <path d="M9 18l6-6-6-6" />
  </svg>
);

export const IconChevronLeft = (p: { size?: number; stroke?: string; sw?: number; style?: React.CSSProperties }) => (
  <svg width={p.size || 16} height={p.size || 16} viewBox="0 0 24 24" fill="none"
    stroke={p.stroke || "currentColor"} strokeWidth={p.sw || 1.5}
    strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, ...p.style }}>
    <path d="M15 18l-6-6 6-6" />
  </svg>
);

export const IconCheck = (p: { size?: number; stroke?: string; sw?: number; style?: React.CSSProperties }) => (
  <svg width={p.size || 16} height={p.size || 16} viewBox="0 0 24 24" fill="none"
    stroke={p.stroke || "currentColor"} strokeWidth={p.sw || 1.5}
    strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, ...p.style }}>
    <path d="M20 6L9 17l-5-5" />
  </svg>
);

export const IconWallet = (p: { size?: number; stroke?: string; sw?: number; style?: React.CSSProperties }) => (
  <svg width={p.size || 16} height={p.size || 16} viewBox="0 0 24 24" fill="none"
    stroke={p.stroke || "currentColor"} strokeWidth={p.sw || 1.5}
    strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, ...p.style }}>
    <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4M3 5v14a2 2 0 0 0 2 2h16v-5M18 12a1 1 0 1 0 0 2 1 1 0 0 0 0-2Z" />
  </svg>
);

export const IconClock = (p: { size?: number; stroke?: string; sw?: number; style?: React.CSSProperties }) => (
  <svg width={p.size || 16} height={p.size || 16} viewBox="0 0 24 24" fill="none"
    stroke={p.stroke || "currentColor"} strokeWidth={p.sw || 1.5}
    strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, ...p.style }}>
    <circle cx="12" cy="12" r="10" />
    <path d="M12 6v6l4 2" />
  </svg>
);

export const IconInfo = (p: { size?: number; stroke?: string; sw?: number; style?: React.CSSProperties }) => (
  <svg width={p.size || 16} height={p.size || 16} viewBox="0 0 24 24" fill="none"
    stroke={p.stroke || "currentColor"} strokeWidth={p.sw || 1.5}
    strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, ...p.style }}>
    <circle cx="12" cy="12" r="10" />
    <path d="M12 16v-4M12 8h.01" />
  </svg>
);

export const IconExternal = (p: { size?: number; stroke?: string; sw?: number; style?: React.CSSProperties }) => (
  <svg width={p.size || 16} height={p.size || 16} viewBox="0 0 24 24" fill="none"
    stroke={p.stroke || "currentColor"} strokeWidth={p.sw || 1.5}
    strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, ...p.style }}>
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3" />
  </svg>
);

export const IconBolt = (p: { size?: number; stroke?: string; sw?: number; style?: React.CSSProperties }) => (
  <svg width={p.size || 16} height={p.size || 16} viewBox="0 0 24 24" fill="none"
    stroke={p.stroke || "currentColor"} strokeWidth={p.sw || 1.5}
    strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, ...p.style }}>
    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8Z" />
  </svg>
);

export const IconCopy = (p: { size?: number; stroke?: string; sw?: number; style?: React.CSSProperties }) => (
  <svg width={p.size || 16} height={p.size || 16} viewBox="0 0 24 24" fill="none"
    stroke={p.stroke || "currentColor"} strokeWidth={p.sw || 1.5}
    strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, ...p.style }}>
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);

/* LogoFull — backward compat for landing page */
export const LogoFull = ({ size = 28 }: { size?: number }) => (
  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
    <BrandMark size={size} />
    <span
      className="display"
      style={{
        fontSize: size * 0.65,
        fontWeight: 600,
        letterSpacing: "-0.04em",
        color: "var(--t-1)",
      }}
    >
      nullcast
    </span>
  </div>
);
