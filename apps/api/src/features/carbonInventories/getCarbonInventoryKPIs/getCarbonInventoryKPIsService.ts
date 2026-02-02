import { InventoryStatus, type PrismaClient } from "@repo/database";
import type { GetCarbonInventoryKPIsResponse } from "@repo/types";
import { groupBy, sumBy, sortBy, uniq, keyBy } from "lodash-es";
import { toNumberOrNull } from "@/utils/number.js";

export type GetCarbonInventoryKPIsResult =
  | { success: true; data: GetCarbonInventoryKPIsResponse }
  | { success: false; error: "INTERNAL_ERROR" };

export const getCarbonInventoryKPIsService = async (
  prismaClient: PrismaClient,
  year?: string
): Promise<GetCarbonInventoryKPIsResult> => {
  // Build where clause for year filtering
  const whereClause: {
    status: { not: InventoryStatus };
    year?: number | null;
  } = {
    status: {
      not: InventoryStatus.DRAFT,
    },
  };

  // Handle year parameter
  // - If year is undefined or "all", don't add year filter (show all years)
  // - If year is a specific year number, filter by that year
  if (year && year !== "all") {
    const yearNumber = parseInt(year, 10);
    if (!isNaN(yearNumber)) {
      whereClause.year = yearNumber;
    }
  }

  // Get all non-DRAFT carbon inventories with their subtotals from the view
  const inventories = await prismaClient.carbonInventory.findMany({
    where: whereClause,
    include: {
      subtotals: true,
    },
  });

  // Flatten all subtotals from all inventories
  const allSubtotals = inventories.flatMap((inventory) => inventory.subtotals);

  // If no subtotals found, return zeros
  if (allSubtotals.length === 0) {
    return {
      success: true,
      data: {
        total: 0,
        categoryTotals: [],
      },
    };
  }

  // Get unique category IDs from subtotals
  const categoryIds = uniq(allSubtotals.map((s) => s.categoryId));

  // Fetch category information
  const categories = await prismaClient.category.findMany({
    where: {
      id: {
        in: categoryIds,
      },
    },
    select: {
      id: true,
      position: true,
      name: true,
    },
  });

  // Create a map of category ID to category info
  const categoryMap = keyBy(categories, (cat) => cat.id.toString());

  // Group subtotals by category and sum values
  const groupedByCategory = groupBy(allSubtotals, "categoryId");

  const categoryTotals = sortBy(
    Object.entries(groupedByCategory).map(([categoryId, items]) => {
      const category = categoryMap[categoryId];
      return {
        categoryPosition: category?.position ?? 0,
        categoryName: category?.name ?? "Unknown",
        total: sumBy(items, ({ value }) => toNumberOrNull(value) ?? 0),
      };
    }),
    "categoryPosition"
  );

  // Calculate grand total
  const total = sumBy(categoryTotals, "total");

  return {
    success: true,
    data: {
      total,
      categoryTotals,
    },
  };
};
