"use client";

interface OddsBarProps {
  yes: number;
  no: number;
  size?: "" | "sm" | "md" | "lg";
  showLabels?: boolean;
  muted?: boolean;
}

export function OddsBar({ yes, no, size = "", showLabels = true, muted = false }: OddsBarProps) {
  const y = Math.max(0, Math.min(100, yes));
  const n = Math.max(0, Math.min(100, no || 100 - y));

  const heights: Record<string, number> = { sm: 6, md: 10, lg: 14, "": 10 };
  const h = heights[size] ?? 10;

  const yesColor = muted ? "var(--ink-4)" : "var(--yes)";
  const noColor = muted ? "var(--ink-4)" : "var(--no)";

  return (
    <div>
      <div
        style={{
          position: "relative",
          height: h,
          borderRadius: 2,
          background: "var(--bg-3)",
          overflow: "hidden",
          display: "flex",
        }}
      >
        <div
          className="odds-fill"
          style={{
            width: `${y}%`,
            background: `linear-gradient(90deg, ${yesColor} 0%, ${muted ? "var(--ink-4)" : "rgba(107,155,122,0.78)"} 100%)`,
          }}
        />
        <div
          className="odds-fill"
          style={{
            width: `${n}%`,
            background: `linear-gradient(90deg, ${muted ? "var(--ink-4)" : "rgba(184,107,107,0.78)"} 0%, ${noColor} 100%)`,
          }}
        />
      </div>
      {showLabels && (
        <div
          className="mono"
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: 6,
            fontSize: 11,
            color: "var(--ink-2)",
          }}
        >
          <span style={{ color: muted ? "var(--ink-3)" : "var(--yes)" }}>
            YES {y.toFixed(0)}%
          </span>
          <span style={{ color: muted ? "var(--ink-3)" : "var(--no)" }}>
            {n.toFixed(0)}% NO
          </span>
        </div>
      )}
    </div>
  );
}
