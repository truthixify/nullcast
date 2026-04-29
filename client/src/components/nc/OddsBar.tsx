"use client";

/** OddsBar — full-width, eased flow on update, optional ripple on bet. */
import { useEffect, useState } from "react";

export const OddsBar = ({
  yes,
  height = 12,
  showLabels = true,
  ripple = false,
  resolved = false,
}: {
  yes: number;
  height?: number;
  showLabels?: boolean;
  ripple?: boolean;
  resolved?: boolean;
}) => {
  const [pct, setPct] = useState(yes);
  useEffect(() => {
    const start = performance.now();
    const from = pct;
    const to = yes;
    let raf: number;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / 600);
      const eased = 1 - Math.pow(1 - p, 3);
      setPct(from + (to - from) * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [yes]);

  return (
    <div className="w-full">
      <div
        className={`relative w-full overflow-hidden rounded-sm ${
          resolved ? "opacity-50" : ""
        }`}
        style={{ height, background: "hsl(var(--surface-3))" }}
      >
        <div
          className={`h-full transition-[width] ${ripple ? "animate-ripple" : ""}`}
          style={{
            width: `${pct}%`,
            background: resolved
              ? "hsl(var(--foreground-3))"
              : "linear-gradient(90deg, hsl(var(--yes) / 0.85), hsl(var(--yes)))",
          }}
        />
        <div
          className="absolute top-0 right-0 h-full"
          style={{
            width: `${100 - pct}%`,
            background: resolved ? "transparent" : "linear-gradient(90deg, hsl(var(--no) / 0.6), hsl(var(--no) / 0.75))",
            opacity: resolved ? 0 : 0.5,
          }}
        />
      </div>
      {showLabels && (
        <div className="mt-2 flex justify-between font-mono text-xs tnum">
          <span className="text-yes">{Math.round(pct)}%</span>
          <span className="text-no">{100 - Math.round(pct)}%</span>
        </div>
      )}
    </div>
  );
};
