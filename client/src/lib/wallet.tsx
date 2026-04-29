"use client";

/**
 * Lightweight global wallet store. No backend — purely client-side mock state
 * so deposit / withdraw / bet / claim flows feel real across the app.
 */
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

export type TxKind = "deposit" | "withdraw" | "send" | "bet" | "claim" | "lp_in" | "lp_out" | "vault_in" | "vault_out" | "mint";

export interface Tx {
  id: string;
  kind: TxKind;
  amount: number;        // signed: + into wallet, − out of wallet
  label: string;         // human label
  ts: number;            // ms
  sealed: boolean;       // encrypted on chain (everything but local mint)
}

interface WalletState {
  address: string;
  balance: number;       // cUSDT
  txs: Tx[];
  drawerOpen: boolean;
  drawerTab: "deposit" | "withdraw" | "send" | "history";
  openWallet: (tab?: WalletState["drawerTab"]) => void;
  closeWallet: () => void;
  setTab: (t: WalletState["drawerTab"]) => void;
  credit: (amount: number, label: string, kind?: TxKind, sealed?: boolean) => void;
  debit: (amount: number, label: string, kind?: TxKind, sealed?: boolean) => boolean;
}

const Ctx = createContext<WalletState | null>(null);

const SEED: Tx[] = [
  { id: "t6", kind: "deposit",  amount:  +500, label: "Funded from L1 bridge",          ts: Date.now() - 1000 * 60 * 60 * 26, sealed: true },
  { id: "t5", kind: "bet",      amount:  -250, label: "YES · BTC > $120k",              ts: Date.now() - 1000 * 60 * 60 * 22, sealed: true },
  { id: "t4", kind: "lp_in",    amount:  -150, label: "LP · FOMC rate cut",             ts: Date.now() - 1000 * 60 * 60 * 18, sealed: true },
  { id: "t3", kind: "vault_in", amount:  -300, label: "Followed · Alpha Strategy",      ts: Date.now() - 1000 * 60 * 60 * 12, sealed: true },
  { id: "t2", kind: "claim",    amount:  +147, label: "Claimed · ETH upgrade resolved", ts: Date.now() - 1000 * 60 * 60 *  4, sealed: true },
  { id: "t1", kind: "deposit",  amount: +2471, label: "Funded from L1 bridge",          ts: Date.now() - 1000 * 60 * 30,      sealed: true },
];

export const WalletProvider = ({ children }: { children: ReactNode }) => {
  const [balance, setBalance] = useState(2418);
  const [txs, setTxs] = useState<Tx[]>(SEED);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState<WalletState["drawerTab"]>("deposit");

  const openWallet = useCallback((tab?: WalletState["drawerTab"]) => {
    if (tab) setDrawerTab(tab);
    setDrawerOpen(true);
  }, []);
  const closeWallet = useCallback(() => setDrawerOpen(false), []);

  const credit = useCallback((amount: number, label: string, kind: TxKind = "deposit", sealed = true) => {
    setBalance((b) => +(b + amount).toFixed(2));
    setTxs((xs) => [{ id: crypto.randomUUID(), kind, amount: +amount, label, ts: Date.now(), sealed }, ...xs]);
  }, []);
  const debit = useCallback((amount: number, label: string, kind: TxKind = "withdraw", sealed = true) => {
    let ok = false;
    setBalance((b) => {
      if (b < amount) return b;
      ok = true;
      return +(b - amount).toFixed(2);
    });
    if (ok) setTxs((xs) => [{ id: crypto.randomUUID(), kind, amount: -amount, label, ts: Date.now(), sealed }, ...xs]);
    return ok;
  }, []);

  const value = useMemo<WalletState>(
    () => ({
      address: "0x7a3c…4e19",
      balance, txs,
      drawerOpen, drawerTab,
      openWallet, closeWallet,
      setTab: setDrawerTab,
      credit, debit,
    }),
    [balance, txs, drawerOpen, drawerTab, openWallet, closeWallet, credit, debit],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

export const useWallet = () => {
  const v = useContext(Ctx);
  if (!v) throw new Error("useWallet must be used inside <WalletProvider>");
  return v;
};

export const fmtAmt = (n: number) =>
  (n >= 0 ? "+" : "−") + Math.abs(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const relTime = (ts: number) => {
  const s = Math.max(1, Math.floor((Date.now() - ts) / 1000));
  if (s < 60)   return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
};

export const TX_LABELS: Record<TxKind, string> = {
  deposit: "Deposit", withdraw: "Withdraw", send: "Send",
  bet: "Bet", claim: "Claim",
  lp_in: "LP add", lp_out: "LP remove",
  vault_in: "Vault deposit", vault_out: "Vault redeem",
  mint: "Mint",
};
