import type { PrismaClient } from "@repo/database";
import type { GetCarbonInventorySubcategoryRecommendationsResponse } from "@repo/types";
import { CarbonInventoryNotFoundError } from "../errors.js";
import { safeParseCarbonInventoryOrganizationData } from "../utils.js";

export const getCarbonInventorySubcategoryRecommendationsService = async (
  prismaClient: PrismaClient,
  carbonInventoryId: string
): Promise<GetCarbonInventorySubcategoryRecommendationsResponse> => {
  const inventory = await prismaClient.carbonInventory.findUnique({
    where: { id: BigInt(carbonInventoryId) },
    select: { organizationData: true },
  });

  if (!inventory) {
    throw new CarbonInventoryNotFoundError(carbonInventoryId);
  }

  const orgData = safeParseCarbonInventoryOrganizationData(
    carbonInventoryId,
    inventory.organizationData
  );

  const sectorId = orgData?.sectorId ?? null;

  if (!sectorId) {
    return { subcategoryIds: [] };
  }

  const subsectorId = orgData?.subsectorId ?? null;

  const recommendations = await prismaClient.subcategoryRecommendation.findMany(
    {
      where: {
        sectorId: BigInt(sectorId),
        OR: [
          { subsectorId: subsectorId ? BigInt(subsectorId) : null },
          { subsectorId: null },
        ],
      },
      select: { subcategoryId: true },
    }
  );

  return {
    subcategoryIds: recommendations.map((r) => r.subcategoryId.toString()),
  };
};
