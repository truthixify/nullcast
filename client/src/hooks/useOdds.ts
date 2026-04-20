"use client";

import { useEffect, useCallback, useRef } from "react";
import { useOddsStore, type OddsData } from "@/lib/store";

const DEFAULT_ODDS: OddsData = {
  yesPool: 0,
  noPool: 0,
  totalBettingPool: 0,
  yesOdds: 50,
  noOdds: 50,
};

/**
 * Global odds hook. Fetches once on first mount for a given market,
 * stores in Zustand so all pages/components share the same data.
 * Only refetches on explicit refresh() (after bet confirmed or sync).
 */
export function useOdds(marketAddress: `0x${string}`) {
  const key = marketAddress.toLowerCase();
  const odds = useOddsStore((s) => s.odds[key]) ?? DEFAULT_ODDS;
  const isFetching = useOddsStore((s) => s.fetching[key]) ?? false;
  const setOdds = useOddsStore((s) => s.setOdds);
  const setFetching = useOddsStore((s) => s.setFetching);
  const hasFetched = useRef(false);

  const fetchOdds = useCallback(
    async (skipCache = false) => {
      // Prevent concurrent fetches for the same market
      if (useOddsStore.getState().fetching[key]) return;
      setFetching(key, true);

      try {
        const url = `/api/odds?market=${marketAddress}${skipCache ? "&fresh=1" : ""}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const data = await res.json();
        setOdds(key, {
          yesPool: data.yesPool ?? 0,
          noPool: data.noPool ?? 0,
          totalBettingPool: data.totalBettingPool ?? 0,
          yesOdds: data.yesOdds ?? 50,
          noOdds: data.noOdds ?? 50,
        });
      } catch {
        // Keep existing odds on error
      } finally {
        setFetching(key, false);
      }
    },
    [key, marketAddress, setOdds, setFetching]
  );

  // Fetch once on first mount — non-blocking, doesn't re-fetch if already in store
  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;

    // If we already have non-default data in store, skip fetch
    const existing = useOddsStore.getState().odds[key];
    if (existing && existing.totalBettingPool > 0) return;

    fetchOdds(false);
  }, [key, fetchOdds]);

  // Manual refresh — bypasses server cache for fresh relayer decrypt
  const refresh = useCallback(() => {
    return fetchOdds(true);
  }, [fetchOdds]);

  return { ...odds, isLoading: isFetching, refresh };
}
