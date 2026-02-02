import type { PrismaClient } from "@repo/database";
import type { GetAllCarbonInventoriesResponse } from "@repo/types";
import { sumBy } from "lodash-es";
import { mapCarbonInventoryToResponse } from "../mappers.js";
import { toNumberOrNull } from "@/utils/number.js";
import { parseYearParam } from "../utils.js";

export const getAllCarbonInventoriesService = async (
  prismaClient: PrismaClient,
  year?: string
): Promise<GetAllCarbonInventoriesResponse> => {
  // Build where clause for year filtering
  const whereClause: {
    year?: number;
  } = {};

  // Handle year parameter
  const parsedYear = parseYearParam(year);
  if (parsedYear !== undefined) {
    whereClause.year = parsedYear;
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
