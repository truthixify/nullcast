"use client";
import { useRef, ReactNode, CSSProperties } from "react";

interface GlowCardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  style?: CSSProperties;
}

export function GlowCard({ children, className = "", onClick, style }: GlowCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const onMove = (e: React.MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${e.clientX - r.left}px`);
    el.style.setProperty("--my", `${e.clientY - r.top}px`);
  };
  return (
    <div ref={ref} className={`glow-card ${className}`} onMouseMove={onMove} onClick={onClick} style={style}>
      {children}
    </div>
  );
}
