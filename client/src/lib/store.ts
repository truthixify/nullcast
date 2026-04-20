import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface Position {
  marketAddress: `0x${string}`;
  side: "YES" | "NO";
  amount: number;
  revealed: boolean;
  entryOdds: number;
  txHash?: string;
  timestamp: number;
}

interface NullCastStore {
  positions: Position[];
  decryptedValues: Record<string, string>;
  addPosition: (position: Omit<Position, "timestamp">) => void;
  setDecryptedValue: (handle: string, value: string) => void;
  invalidateDecryptedValues: (marketAddress: string) => void;
  revealPosition: (marketAddress: string) => void;
}

export const useNullCastStore = create<NullCastStore>()(
  persist(
    (set) => ({
      positions: [],
      decryptedValues: {},

      addPosition: (position) =>
        set((state) => ({
          positions: [
            { ...position, timestamp: Date.now() },
            ...state.positions,
          ],
        })),

      setDecryptedValue: (handle, value) =>
        set((state) => ({
          decryptedValues: { ...state.decryptedValues, [handle]: value },
        })),

      invalidateDecryptedValues: (marketAddress) =>
        set((state) => {
          const next = { ...state.decryptedValues };
          delete next[`${marketAddress}-yes`];
          delete next[`${marketAddress}-no`];
          return { decryptedValues: next };
        }),

      revealPosition: (marketAddress) =>
        set((state) => ({
          positions: state.positions.map((p) =>
            p.marketAddress === marketAddress ? { ...p, revealed: true } : p
          ),
        })),
    }),
    {
      name: "NullCast-positions",
    }
  )
);

/* ── Global Odds Store ──────────────────────────────────────────── */

export interface OddsData {
  yesPool: number;
  noPool: number;
  totalBettingPool: number;
  yesOdds: number;
  noOdds: number;
}

interface OddsStore {
  // market address (lowercase) -> odds data
  odds: Record<string, OddsData>;
  // tracks which markets are currently being fetched
  fetching: Record<string, boolean>;
  setOdds: (market: string, data: OddsData) => void;
  setFetching: (market: string, val: boolean) => void;
}

export const useOddsStore = create<OddsStore>()((set) => ({
  odds: {},
  fetching: {},
  setOdds: (market, data) =>
    set((state) => ({
      odds: { ...state.odds, [market.toLowerCase()]: data },
    })),
  setFetching: (market, val) =>
    set((state) => ({
      fetching: { ...state.fetching, [market.toLowerCase()]: val },
    })),
}));
