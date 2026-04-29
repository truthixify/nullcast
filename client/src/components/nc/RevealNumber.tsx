"use client";

import { useEffect, useRef, useState } from "react";

/** Slot-machine reveal: shows scrambling glyphs, then resolves into the value. */
export const RevealNumber = ({
  value,
  revealed,
  className = "",
  prefix = "",
  suffix = "",
}: {
  value: string;
  revealed: boolean;
  className?: string;
  prefix?: string;
  suffix?: string;
}) => {
  const [display, setDisplay] = useState<string>("••••••••");
  const raf = useRef<number>();

  useEffect(() => {
    if (!revealed) {
      setDisplay("••••••••");
      return;
    }
    const glyphs = "▓▒░▌█▀0123456789.";
    const target = `${prefix}${value}${suffix}`;
    const start = performance.now();
    const dur = 520;

    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / dur);
      const reveal = Math.floor(p * target.length);
      let s = "";
      for (let i = 0; i < target.length; i++) {
        s += i < reveal ? target[i] : glyphs[Math.floor(Math.random() * glyphs.length)];
      }
      setDisplay(s);
      if (p < 1) raf.current = requestAnimationFrame(tick);
      else setDisplay(target);
    };
    raf.current = requestAnimationFrame(tick);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
  }, [revealed, value, prefix, suffix]);

  return (
    <span
      className={`font-mono tnum tabular-nums transition-colors duration-500 ${
        revealed ? "text-fg" : "text-fg-3"
      } ${className}`}
      style={revealed ? { color: "hsl(var(--reveal))", transition: "color 0.6s ease" } : undefined}
    >
      {display}
    </span>
  );
};
