"use client";

interface OddsBarProps {
  yes: number;
  no: number;
  size?: "" | "lg" | "sm";
}

export function OddsBar({ yes, no, size = "" }: OddsBarProps) {
  const y = Math.max(0, Math.min(100, yes));
  const n = Math.max(0, Math.min(100, no || 100 - y));
  return (
    <div className={`odds ${size}`}>
      <span className="yes-pct">{y.toFixed(0)}%</span>
      <div className="track" style={{ "--yes-w": y + "%" } as React.CSSProperties}>
        <div className="yes-fill" />
        <div className="divider" />
      </div>
      <span className="no-pct">{n.toFixed(0)}%</span>
    </div>
  );
}
