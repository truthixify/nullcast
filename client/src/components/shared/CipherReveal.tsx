"use client";
import { useState, useEffect, useRef } from "react";

interface CipherRevealProps {
  value: string;
  reveal: boolean;
  width?: number;
  onDone?: () => void;
  className?: string;
}

export function CipherReveal({ value, reveal, width = 9, onDone, className = "" }: CipherRevealProps) {
  const [phase, setPhase] = useState<"hidden" | "scramble" | "done">("hidden");
  const [text, setText] = useState("\u2022".repeat(width));
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!reveal) {
      setPhase("hidden");
      setText("\u2022".repeat(width));
      return;
    }
    if (phase === "done") return;
    setPhase("scramble");
    const start = performance.now();
    const DURATION = 520;
    const CHARS = "0123456789.";
    const target = value;
    const targetLen = target.length;

    function tick(now: number) {
      const t = Math.min(1, (now - start) / DURATION);
      if (t >= 1) {
        setText(target);
        setPhase("done");
        onDone?.();
        return;
      }
      // progressively lock characters left-to-right
      const lockCount = Math.floor(t * targetLen);
      let out = "";
      for (let i = 0; i < targetLen; i++) {
        if (i < lockCount) out += target[i];
        else if (target[i] === "." || target[i] === ",") out += target[i];
        else out += CHARS[Math.floor(Math.random() * CHARS.length)];
      }
      setText(out);
      rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reveal]);

  const cls =
    phase === "done"
      ? "cipher-cell revealed bloom-gold"
      : phase === "scramble"
        ? "cipher-cell revealing"
        : "cipher-cell";

  return <span className={`${cls} ${className}`}>{text}</span>;
}
