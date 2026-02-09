import type { PrismaClient } from "@repo/database";
import type {
  GetAllCarbonInventoriesResponse,
  GetAllCarbonInventoriesQuery,
} from "@repo/types";
import { sumBy } from "lodash-es";
import { mapCarbonInventoryToResponse } from "../mappers.js";
import { toNumberOrNull, kgToTon } from "@/utils/number.js";

export const getAllCarbonInventoriesService = async (
  prismaClient: PrismaClient,
  query?: GetAllCarbonInventoriesQuery
): Promise<GetAllCarbonInventoriesResponse> => {
  // Build where clause for year filtering
  const whereClause: {
    year?: number;
  } = {};

  whereClause.year = query?.year ? parseInt(query.year, 10) : undefined;

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
    totalEmissions: kgToTon(
      sumBy(inventory.subtotals, ({ value }) => toNumberOrNull(value) ?? 0)
    ),
  }));
};
