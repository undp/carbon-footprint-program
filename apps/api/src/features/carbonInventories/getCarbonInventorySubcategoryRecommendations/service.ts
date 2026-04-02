import type { PrismaClient } from "@repo/database";
import {
  type GetCarbonInventorySubcategoryRecommendationsResponse,
  SubcategoryRecommendationModeEnum,
  SystemParameterKeyEnum,
} from "@repo/types";
import { getSystemParameterValue } from "@/helpers/getSystemParameterValue.js";
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

  const mode = await getSystemParameterValue(
    prismaClient,
    SystemParameterKeyEnum.SUBCATEGORY_RECOMMENDATION_MODE
  );

  const isSpecific = mode === SubcategoryRecommendationModeEnum.SPECIFIC;

  const recommendations = await prismaClient.subcategoryRecommendation.findMany(
    {
      where: isSpecific
        ? {
            sectorId: BigInt(sectorId),
            subsectorId: subsectorId ? BigInt(subsectorId) : null,
          }
        : {
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
    subcategoryIds: [
      ...new Set(recommendations.map((r) => r.subcategoryId.toString())),
    ],
  };
};
