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
