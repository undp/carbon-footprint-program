import type { PrismaClient } from "@repo/database";
import type { GetAllCarbonInventoriesResponse } from "@repo/types";
import { sumBy } from "lodash-es";
import { mapCarbonInventoryToResponse } from "../mappers.js";
import { toNumberOrNull } from "@/utils/number.js";

export const getAllCarbonInventoriesService = async (
  prismaClient: PrismaClient,
  year?: string
): Promise<GetAllCarbonInventoriesResponse> => {
  // Build where clause for year filtering
  const whereClause: {
    year?: number | null;
  } = {};

  // Handle year parameter
  // - If year is undefined or "all", don't add year filter (show all years)
  // - If year is a specific year number, filter by that year
  if (year && year !== "all") {
    const yearNumber = parseInt(year, 10);
    if (!isNaN(yearNumber)) {
      whereClause.year = yearNumber;
    }
  }

  const data = await prismaClient.carbonInventory.findMany({
    where: whereClause,
    include: {
      subtotals: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return data.map((inventory) => ({
    ...mapCarbonInventoryToResponse(inventory),
    totalEmissions: sumBy(
      inventory.subtotals,
      ({ value }) => toNumberOrNull(value) ?? 0
    ),
  }));
};
