"use client";

/**
 * Watchlist — saved markets. localStorage backed.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

interface State {
  ids: Set<string>;
  toggle: (id: string) => boolean; // returns new state
  has: (id: string) => boolean;
}

const Ctx = createContext<State | null>(null);
const KEY = "nc.watchlist.v1";

export const WatchlistProvider = ({ children }: { children: ReactNode }) => {
  const [ids, setIds] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set();
    try {
      const raw = localStorage.getItem(KEY);
      return new Set<string>(raw ? JSON.parse(raw) : []);
    } catch { return new Set(); }
  });

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(Array.from(ids))); } catch { /* ignore */ }
  }, [ids]);

  const has = useCallback((id: string) => ids.has(id), [ids]);
  const toggle = useCallback((id: string) => {
    let nowOn = false;
    setIds((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else { next.add(id); nowOn = true; }
      return next;
    });
    return nowOn;
  }, []);

  const value = useMemo(() => ({ ids, toggle, has }), [ids, toggle, has]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

export const useWatchlist = () => {
  const v = useContext(Ctx);
  if (!v) throw new Error("useWatchlist must be used inside <WatchlistProvider>");
  return v;
};
