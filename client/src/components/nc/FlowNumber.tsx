"use client";

import { useEffect, useState } from "react";

/** Animated number that flows to its target value (no jumps). */
export const FlowNumber = ({
  value,
  duration = 600,
  decimals = 0,
  className = "",
  suffix = "",
}: {
  value: number;
  duration?: number;
  decimals?: number;
  className?: string;
  suffix?: string;
}) => {
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    const start = performance.now();
    const from = display;
    const to = value;
    let raf: number;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(from + (to - from) * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <span className={`font-mono tnum ${className}`}>
      {display.toFixed(decimals)}{suffix}
    </span>
  );
};
