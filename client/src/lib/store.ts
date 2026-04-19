import { create } from "zustand";

interface Position {
  marketAddress: `0x${string}`;
  side: "YES" | "NO";
  amount: number;
  revealed: boolean;
  entryOdds: number;
  txHash?: string;
}

interface NullCastStore {
  positions: Position[];
  decryptedValues: Record<string, bigint>;
  addPosition: (position: Position) => void;
  setDecryptedValue: (handle: string, value: bigint) => void;
  revealPosition: (marketAddress: string) => void;
}

export const useNullCastStore = create<NullCastStore>((set) => ({
  positions: [],
  decryptedValues: {},

  addPosition: (position) =>
    set((state) => ({
      positions: [position, ...state.positions],
    })),

  setDecryptedValue: (handle, value) =>
    set((state) => ({
      decryptedValues: { ...state.decryptedValues, [handle]: value },
    })),

  revealPosition: (marketAddress) =>
    set((state) => ({
      positions: state.positions.map((p) =>
        p.marketAddress === marketAddress ? { ...p, revealed: true } : p
      ),
    })),
}));
