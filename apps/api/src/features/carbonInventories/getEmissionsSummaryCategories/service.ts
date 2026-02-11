import type { PrismaClient } from "@repo/database";
import type { GetEmissionsSummaryCategoriesResponse } from "@repo/types";
import { distributePercentages, roundEmissions } from "../utils.js";
import { fetchInventoryWithCategoryData } from "../helpers.js";

export const getEmissionsSummaryCategoriesService = async (
  prismaClient: PrismaClient,
  id: string
): Promise<GetEmissionsSummaryCategoriesResponse> => {
  const { inventory, categoryData, totalEmissions } =
    await fetchInventoryWithCategoryData(prismaClient, id);

  // Calculate category percentages (sum to 1 across the inventory)
  const categorySubtotals = categoryData.map((c) => c.subtotal);
  const categoryPercentages = distributePercentages(
    categorySubtotals,
    totalEmissions
  );

  const categories = categoryData.map((category, catIdx) => ({
    id: category.id,
    name: category.name,
    synonyms: category.synonyms,
    position: category.position,
    subtotal: roundEmissions(category.subtotal),
    percentage: categoryPercentages[catIdx],
  }));

  return {
    carbonInventory: {
      id: inventory.id.toString(),
      name: inventory.name,
    },
    totalEmissions: roundEmissions(totalEmissions),
    categories,
  };
};
