"use client";

import { useEffect, useRef } from "react";

/** Wraps children with cursor-following border glow. */
export const GlowCard = ({
  className = "",
  children,
  ...rest
}: React.HTMLAttributes<HTMLDivElement>) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onMove = (e: MouseEvent) => {
      const r = el.getBoundingClientRect();
      el.style.setProperty("--mx", `${e.clientX - r.left}px`);
      el.style.setProperty("--my", `${e.clientY - r.top}px`);
    };
    el.addEventListener("mousemove", onMove);
    return () => el.removeEventListener("mousemove", onMove);
  }, []);

  return (
    <div ref={ref} className={`card-etched glow-cursor ${className}`} {...rest}>
      {children}
    </div>
  );
};
