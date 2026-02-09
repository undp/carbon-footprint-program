import type { RankingSeverity } from "@repo/types";

/**
 * Distributes percentages using the largest remainder method so they sum to exactly 1.
 * Each percentage is rounded to 4 decimal places.
 */
export function distributePercentages(
  values: number[],
  total: number
): number[] {
  if (total === 0 || values.length === 0) {
    return values.map(() => 0);
  }

  const rawPercentages = values.map((v) => v / total);
  const truncated = rawPercentages.map((p) => Math.floor(p * 10000) / 10000);
  const remainders = rawPercentages.map(
    (p) => p * 10000 - Math.floor(p * 10000)
  );

  const currentSum = truncated.reduce((a, b) => a + b, 0);
  const diff = Math.round((1 - currentSum) * 10000);

  // Sort indices by remainder descending, and add 0.0001 to each until sum = 1
  const sorted = remainders
    .map((remainder, index) => ({ remainder, index }))
    .sort((a, b) => b.remainder - a.remainder);

  for (let i = 0; i < diff && i < sorted.length; i++) {
    truncated[sorted[i].index] += 0.0001;
  }

  return truncated.map((p) => Math.round(p * 10000) / 10000);
}

export function getRankingSeverity(percentage: number): RankingSeverity {
  if (percentage >= 0.25) return "HIGH";
  if (percentage >= 0.1) return "MEDIUM";
  return "LOW";
}
