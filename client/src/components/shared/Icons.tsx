"use client";

import { CSSProperties, ReactNode } from "react";

interface IconProps {
  path?: string;
  size?: number;
  fill?: boolean;
  stroke?: string;
  sw?: number;
  style?: CSSProperties;
  children?: ReactNode;
  viewBox?: string;
}

export const Icon = ({
  path,
  size = 16,
  fill = false,
  stroke = "currentColor",
  sw = 1.5,
  style,
  children,
  viewBox = "0 0 24 24",
}: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox={viewBox}
    fill={fill ? stroke : "none"}
    stroke={fill ? "none" : stroke}
    strokeWidth={sw}
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ flexShrink: 0, ...style }}
  >
    {children || <path d={path} />}
  </svg>
);

interface LogoMarkProps {
  size?: number;
  accent?: string;
}

export const LogoMark = ({
  size = 28,
  accent = "var(--color-accent)",
}: LogoMarkProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 28 28"
    fill="none"
    style={{ flexShrink: 0 }}
  >
    <rect
      x="1"
      y="1"
      width="26"
      height="26"
      rx="7"
      stroke={accent}
      strokeWidth="2"
    />
    <line
      x1="8"
      y1="20"
      x2="20"
      y2="8"
      stroke={accent}
      strokeWidth="2.5"
      strokeLinecap="round"
    />
  </svg>
);

interface LogoFullProps {
  size?: number;
  accent?: string;
}

export const LogoFull = ({
  size = 28,
  accent = "var(--color-accent)",
}: LogoFullProps) => (
  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
    <LogoMark size={size} accent={accent} />
    <span
      className="display"
      style={{
        fontSize: size * 0.65,
        fontWeight: 700,
        letterSpacing: "-0.04em",
        color: "var(--color-text-primary)",
      }}
    >
      nullcast
    </span>
  </div>
);

interface SimpleIconProps {
  size?: number;
  stroke?: string;
  sw?: number;
  style?: CSSProperties;
}

export const LockIcon = ({
  size = 16,
  stroke = "var(--color-privacy)",
  sw = 1.5,
  style,
}: SimpleIconProps) => (
  <Icon
    size={size}
    stroke={stroke}
    sw={sw}
    style={style}
    path="M19 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2Z M7 11V7a5 5 0 0 1 10 0v4"
  />
);

interface FHEBadgeProps {
  size?: number;
}

export const FHEBadge = ({ size = 14 }: FHEBadgeProps) => (
  <span className="pill pill-privacy">
    <LockIcon size={size - 2} stroke="var(--color-privacy-text)" sw={1.8} />
    FHE
  </span>
);

export const IconSearch = ({ size = 16, stroke, sw, style }: SimpleIconProps) => (
  <Icon size={size} stroke={stroke} sw={sw} style={style} path="M21 21l-4.35-4.35M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z" />
);

export const IconChevronDown = ({ size = 16, stroke, sw, style }: SimpleIconProps) => (
  <Icon size={size} stroke={stroke} sw={sw} style={style} path="M6 9l6 6 6-6" />
);

export const IconChevronRight = ({ size = 16, stroke, sw, style }: SimpleIconProps) => (
  <Icon size={size} stroke={stroke} sw={sw} style={style} path="M9 18l6-6-6-6" />
);

export const IconChevronLeft = ({ size = 16, stroke, sw, style }: SimpleIconProps) => (
  <Icon size={size} stroke={stroke} sw={sw} style={style} path="M15 18l-6-6 6-6" />
);

export const IconArrowRight = ({ size = 16, stroke, sw, style }: SimpleIconProps) => (
  <Icon size={size} stroke={stroke} sw={sw} style={style} path="M5 12h14M12 5l7 7-7 7" />
);

export const IconArrowUp = ({ size = 16, stroke, sw, style }: SimpleIconProps) => (
  <Icon size={size} stroke={stroke} sw={sw} style={style} path="M12 19V5M5 12l7-7 7 7" />
);

export const IconArrowDown = ({ size = 16, stroke, sw, style }: SimpleIconProps) => (
  <Icon size={size} stroke={stroke} sw={sw} style={style} path="M12 5v14M19 12l-7 7-7-7" />
);

export const IconClose = ({ size = 16, stroke, sw, style }: SimpleIconProps) => (
  <Icon size={size} stroke={stroke} sw={sw} style={style} path="M18 6L6 18M6 6l12 12" />
);

export const IconCheck = ({ size = 16, stroke, sw, style }: SimpleIconProps) => (
  <Icon size={size} stroke={stroke} sw={sw} style={style} path="M20 6L9 17l-5-5" />
);

export const IconEye = ({ size = 16, stroke, sw, style }: SimpleIconProps) => (
  <Icon size={size} stroke={stroke} sw={sw} style={style}>
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" />
    <circle cx="12" cy="12" r="3" />
  </Icon>
);

export const IconClock = ({ size = 16, stroke, sw, style }: SimpleIconProps) => (
  <Icon size={size} stroke={stroke} sw={sw} style={style}>
    <circle cx="12" cy="12" r="10" />
    <path d="M12 6v6l4 2" />
  </Icon>
);

export const IconInfo = ({ size = 16, stroke, sw, style }: SimpleIconProps) => (
  <Icon size={size} stroke={stroke} sw={sw} style={style}>
    <circle cx="12" cy="12" r="10" />
    <path d="M12 16v-4M12 8h.01" />
  </Icon>
);

export const IconWallet = ({ size = 16, stroke, sw, style }: SimpleIconProps) => (
  <Icon size={size} stroke={stroke} sw={sw} style={style} path="M21 12V7H5a2 2 0 0 1 0-4h14v4M3 5v14a2 2 0 0 0 2 2h16v-5M18 12a1 1 0 1 0 0 2 1 1 0 0 0 0-2Z" />
);

export const IconChart = ({ size = 16, stroke, sw, style }: SimpleIconProps) => (
  <Icon size={size} stroke={stroke} sw={sw} style={style} path="M18 20V10M12 20V4M6 20v-6" />
);

export const IconGrid = ({ size = 16, stroke, sw, style }: SimpleIconProps) => (
  <Icon size={size} stroke={stroke} sw={sw} style={style} path="M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z" />
);

export const IconBell = ({ size = 16, stroke, sw, style }: SimpleIconProps) => (
  <Icon size={size} stroke={stroke} sw={sw} style={style} path="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9ZM13.73 21a2 2 0 0 1-3.46 0" />
);

export const IconSettings = ({ size = 16, stroke, sw, style }: SimpleIconProps) => (
  <Icon size={size} stroke={stroke} sw={sw} style={style}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
  </Icon>
);

export const IconPlus = ({ size = 16, stroke, sw, style }: SimpleIconProps) => (
  <Icon size={size} stroke={stroke} sw={sw} style={style} path="M12 5v14M5 12h14" />
);

export const IconFilter = ({ size = 16, stroke, sw, style }: SimpleIconProps) => (
  <Icon size={size} stroke={stroke} sw={sw} style={style} path="M22 3H2l8 9.46V19l4 2v-8.54L22 3Z" />
);

export const IconBolt = ({ size = 16, stroke, sw, style }: SimpleIconProps) => (
  <Icon size={size} stroke={stroke} sw={sw} style={style} path="M13 2L3 14h9l-1 8 10-12h-9l1-8Z" />
);

export const IconShield = ({ size = 16, stroke, sw, style }: SimpleIconProps) => (
  <Icon size={size} stroke={stroke} sw={sw} style={style} path="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
);

export const IconFlame = ({ size = 16, stroke, sw, style }: SimpleIconProps) => (
  <Icon size={size} stroke={stroke} sw={sw} style={style} path="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5Z" />
);

export const IconCopy = ({ size = 16, stroke, sw, style }: SimpleIconProps) => (
  <Icon size={size} stroke={stroke} sw={sw} style={style}>
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </Icon>
);

export const IconExternal = ({ size = 16, stroke, sw, style }: SimpleIconProps) => (
  <Icon size={size} stroke={stroke} sw={sw} style={style} path="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3" />
);

export const IconMenu = ({ size = 16, stroke, sw, style }: SimpleIconProps) => (
  <Icon size={size} stroke={stroke} sw={sw} style={style} path="M3 12h18M3 6h18M3 18h18" />
);

export const IconSparkle = ({ size = 16, stroke, sw, style }: SimpleIconProps) => (
  <Icon size={size} stroke={stroke} sw={sw} style={style} path="M12 3l1.912 5.813a2 2 0 0 0 1.275 1.275L21 12l-5.813 1.912a2 2 0 0 0-1.275 1.275L12 21l-1.912-5.813a2 2 0 0 0-1.275-1.275L3 12l5.813-1.912a2 2 0 0 0 1.275-1.275L12 3Z" />
);
