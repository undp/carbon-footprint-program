import type { PrismaClient } from "@repo/database";
import type { GetSectorRankingResponse } from "@repo/types";
import { distributePercentages, getRankingSeverity } from "../utils.js";
import { fetchInventoryWithCategoryData } from "../helpers.js";

// TODO: This is a stub that duplicates the own-organization ranking.
// Replace with real sector-level ranking data once the sector comparison API is available.
export const getSectorRankingService = async (
  prismaClient: PrismaClient,
  id: string
): Promise<GetSectorRankingResponse> => {
  const { categoryData, totalEmissions } = await fetchInventoryWithCategoryData(
    prismaClient,
    id
  );

  const allSubcategories = categoryData.flatMap((category) =>
    category.subcategories.map((sub) => ({
      name: sub.name,
      categoryName: category.name,
      categoryPosition: category.position,
      categoryColor: category.color,
      subtotal: sub.subtotal,
    }))
  );

  const sorted = [...allSubcategories].sort(
    (a, b) =>
      b.subtotal - a.subtotal ||
      a.categoryPosition - b.categoryPosition ||
      a.name.localeCompare(b.name)
  );

  const rankingSubtotals = sorted.map((s) => s.subtotal);
  const rankingPercentages = distributePercentages(
    rankingSubtotals,
    totalEmissions
  );

  // Standard competition ranking
  const positions: number[] = [];
  for (let i = 0; i < sorted.length; i++) {
    positions.push(
      i > 0 && sorted[i].subtotal === sorted[i - 1].subtotal
        ? positions[i - 1]
        : i + 1
    );
  }

  return sorted.map((item, idx) => ({
    rank: positions[idx],
    name: item.name,
    categoryName: item.categoryName,
    categoryPosition: item.categoryPosition,
    categoryColor: item.categoryColor,
    subtotal: item.subtotal,
    percentage: rankingPercentages[idx],
    severity: getRankingSeverity(rankingPercentages[idx]),
  }));
};
