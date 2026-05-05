import type { PrismaClient } from "@repo/database";
import { type GetEmissionsSummaryCategoriesResponse } from "@repo/types";
import { distributePercentages } from "../utils.js";
import {
  fetchCategoryData,
  calculateDisplayStatus,
  carbonInventoryBaseSelect,
  carbonInventoryWithSubmissionsMinimalSelect,
} from "../helpers.js";
import {
  CarbonInventoryNotFoundError,
  MethodologyNotFoundError,
} from "../errors.js";

export const getEmissionsSummaryCategoriesService = async (
  prismaClient: PrismaClient,
  id: string
): Promise<GetEmissionsSummaryCategoriesResponse> => {
  const inventory = await prismaClient.carbonInventory.findUnique({
    where: { id: BigInt(id) },
    select: {
      ...carbonInventoryBaseSelect,
      ...carbonInventoryWithSubmissionsMinimalSelect,
      organizationId: true,
    },
  });

  if (!inventory) {
    throw new CarbonInventoryNotFoundError(id);
  }

  if (!inventory.methodologyVersionId) {
    throw new MethodologyNotFoundError(id);
  }

  const { categoryData, totalEmissions } = await fetchCategoryData(
    prismaClient,
    inventory
  );

  const displayStatus = calculateDisplayStatus(inventory);

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
    icon: category.icon,
    color: category.color,
    subtotal: category.subtotal,
    percentage: categoryPercentages[catIdx],
  }));

  return {
    carbonInventory: {
      id: inventory.id.toString(),
      name: inventory.name,
      organizationId: inventory.organizationId?.toString() ?? null,
      status: displayStatus,
    },
    totalEmissions,
    categories,
  };
};
