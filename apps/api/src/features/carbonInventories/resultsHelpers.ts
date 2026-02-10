import type { RankingSeverity } from "@repo/types";
import {
  PERCENTAGE_PRECISION,
  EMISSIONS_PRECISION,
} from "@/config/constants.js";

const pFactor = 10 ** PERCENTAGE_PRECISION;
const eFactor = 10 ** EMISSIONS_PRECISION;

/**
 * Distributes percentages using the largest remainder method so they sum to exactly 1.
 * Each percentage is rounded to {@link PERCENTAGE_PRECISION} decimal places.
 */
export function distributePercentages(
  values: number[],
  total: number
): number[] {
  if (total === 0 || values.length === 0) {
    return values.map(() => 0);
  }

  const rawPercentages = values.map((v) => v / total);
  const truncated = rawPercentages.map(
    (p) => Math.floor(p * pFactor) / pFactor
  );
  const remainders = rawPercentages.map(
    (p) => p * pFactor - Math.floor(p * pFactor)
  );

  const currentSum = truncated.reduce((a, b) => a + b, 0);
  const diff = Math.round((1 - currentSum) * pFactor);
  const step = 1 / pFactor;

  // Sort indices by remainder descending, and add one step to each until sum = 1
  const sorted = remainders
    .map((remainder, index) => ({ remainder, index }))
    .sort((a, b) => b.remainder - a.remainder);

  for (let i = 0; i < diff && i < sorted.length; i++) {
    truncated[sorted[i].index] += step;
  }

  return truncated.map((p) => Math.round(p * pFactor) / pFactor);
}

export function roundEmissions(n: number): number {
  return Math.round(n * eFactor) / eFactor;
}

export function getRankingSeverity(percentage: number): RankingSeverity {
  if (percentage >= 0.25) return "HIGH";
  if (percentage >= 0.1) return "MEDIUM";
  return "LOW";
}
