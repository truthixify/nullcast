export const TIERS = [
  { name: "Oracle", threshold: 80, color: "var(--acc)" },
  { name: "Strategist", threshold: 60, color: "var(--yes)" },
  { name: "Analyst", threshold: 40, color: "var(--enc)" },
  { name: "Explorer", threshold: 20, color: "var(--t-2)" },
] as const;

export type TierName = (typeof TIERS)[number]["name"];

export function getTierFromScore(score: number): (typeof TIERS)[number] | null {
  for (const tier of TIERS) {
    if (score >= tier.threshold) return tier;
  }
  return null;
}
