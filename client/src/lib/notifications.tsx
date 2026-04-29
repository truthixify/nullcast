"use client";

/**
 * Notifications center store. Plain client-side mock — seeds a few realistic
 * events and exposes a way to mark read / clear.
 */
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

export type NotifKind = "resolution" | "payout" | "lp_fee" | "vault" | "system";

export interface Notif {
  id: string;
  kind: NotifKind;
  title: string;
  body: string;
  ts: number;
  read: boolean;
  href?: string;
}

interface State {
  items: Notif[];
  unread: number;
  push: (n: Omit<Notif, "id" | "ts" | "read">) => void;
  markAllRead: () => void;
  clear: () => void;
}

const Ctx = createContext<State | null>(null);

const SEED: Notif[] = [
  {
    id: "n1",
    kind: "payout",
    title: "Payout sealed",
    body: "Claimed 147.05 cUSDT on “ETH upgrade Q3”.",
    ts: Date.now() - 1000 * 60 * 12,
    read: false,
    href: "/portfolio",
  },
  {
    id: "n2",
    kind: "resolution",
    title: "Market resolved · YES",
    body: "“Ethereum upgrade Q3” settled. Winners may claim.",
    ts: Date.now() - 1000 * 60 * 60 * 2,
    read: false,
    href: "/markets/eth-merge-2",
  },
  {
    id: "n3",
    kind: "lp_fee",
    title: "Liquidity fees",
    body: "+3.21 cUSDT accrued on FOMC pool.",
    ts: Date.now() - 1000 * 60 * 60 * 8,
    read: true,
    href: "/liquidity",
  },
  {
    id: "n4",
    kind: "vault",
    title: "Alpha Strategy +2.4%",
    body: "Followed vault rebalanced its sealed positions.",
    ts: Date.now() - 1000 * 60 * 60 * 22,
    read: true,
    href: "/vaults",
  },
];

export const NotificationsProvider = ({ children }: { children: ReactNode }) => {
  const [items, setItems] = useState<Notif[]>(SEED);

  const push = useCallback((n: Omit<Notif, "id" | "ts" | "read">) => {
    setItems((xs) => [{ ...n, id: crypto.randomUUID(), ts: Date.now(), read: false }, ...xs]);
  }, []);
  const markAllRead = useCallback(() => setItems((xs) => xs.map((x) => ({ ...x, read: true }))), []);
  const clear = useCallback(() => setItems([]), []);

  const value = useMemo<State>(
    () => ({ items, unread: items.filter((x) => !x.read).length, push, markAllRead, clear }),
    [items, push, markAllRead, clear],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

export const useNotifications = () => {
  const v = useContext(Ctx);
  if (!v) throw new Error("useNotifications must be used inside <NotificationsProvider>");
  return v;
};

export const relTime = (ts: number) => {
  const s = Math.max(1, Math.floor((Date.now() - ts) / 1000));
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
};
