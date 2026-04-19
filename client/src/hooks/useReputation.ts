"use client";

import { useReadContract } from "wagmi";
import { reputationGateConfig } from "@/lib/contracts";

export function useReputation(userAddress?: `0x${string}`) {
  const { data: hasScore, isLoading: isScoreLoading } = useReadContract({
    ...reputationGateConfig,
    functionName: "hasScore",
    args: userAddress ? [userAddress] : undefined,
    query: { enabled: !!userAddress },
  });

  const { data: participation, isLoading: isParticipationLoading } = useReadContract({
    ...reputationGateConfig,
    functionName: "marketParticipation",
    args: userAddress ? [userAddress] : undefined,
    query: { enabled: !!userAddress },
  });

  const { data: lastUpdated, isLoading: isLastUpdatedLoading } = useReadContract({
    ...reputationGateConfig,
    functionName: "getLastUpdated",
    args: userAddress ? [userAddress] : undefined,
    query: { enabled: !!userAddress },
  });

  return {
    hasScore: hasScore as boolean | undefined,
    participation: participation ? Number(participation) : 0,
    lastUpdated: lastUpdated ? Number(lastUpdated) : 0,
    isLoading: isScoreLoading || isParticipationLoading || isLastUpdatedLoading,
  };
}
