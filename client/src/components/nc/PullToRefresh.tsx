"use client";

/**
 * Lightweight pull-to-refresh wrapper for mobile lists.
 * Pulls when scrollTop is at 0 and finger drags down past threshold.
 */
import { useEffect, useRef, useState, type ReactNode } from "react";

interface Props {
  onRefresh: () => Promise<void> | void;
  children: ReactNode;
  className?: string;
}

const THRESHOLD = 70;

export const PullToRefresh = ({ onRefresh, children, className = "" }: Props) => {
  const ref = useRef<HTMLDivElement | null>(null);
  const startY = useRef<number | null>(null);
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const onStart = (e: TouchEvent) => {
      if (window.scrollY > 0) return;
      startY.current = e.touches[0].clientY;
    };
    const onMove = (e: TouchEvent) => {
      if (startY.current == null || refreshing) return;
      const dy = e.touches[0].clientY - startY.current;
      if (dy > 0) {
        setPull(Math.min(dy * 0.5, 100));
      }
    };
    const onEnd = async () => {
      if (startY.current == null) return;
      if (pull >= THRESHOLD) {
        setRefreshing(true);
        try { await onRefresh(); } finally {
          setRefreshing(false);
          setPull(0);
        }
      } else {
        setPull(0);
      }
      startY.current = null;
    };

    el.addEventListener("touchstart", onStart, { passive: true });
    el.addEventListener("touchmove", onMove,  { passive: true });
    el.addEventListener("touchend",  onEnd);
    return () => {
      el.removeEventListener("touchstart", onStart);
      el.removeEventListener("touchmove", onMove);
      el.removeEventListener("touchend",  onEnd);
    };
  }, [pull, refreshing, onRefresh]);

  const progress = Math.min(1, pull / THRESHOLD);

  return (
    <div ref={ref} className={className}>
      <div
        className="lg:hidden flex items-center justify-center overflow-hidden transition-[height] duration-150"
        style={{ height: pull }}
        aria-hidden
      >
        <div
          className="font-mono text-[10px] uppercase tracking-[0.2em] text-fg-3 flex items-center gap-2"
          style={{ opacity: progress }}
        >
          <span
            className="inline-block h-1.5 w-1.5 rounded-full bg-primary transition-transform"
            style={{ transform: `scale(${0.4 + progress * 0.8})` }}
          />
          {refreshing ? "Refreshing…" : progress >= 1 ? "Release" : "Pull"}
        </div>
      </div>
      <div style={{ transform: `translateY(${pull}px)`, transition: pull === 0 ? "transform 200ms ease" : "none" }}>
        {children}
      </div>
    </div>
  );
};
