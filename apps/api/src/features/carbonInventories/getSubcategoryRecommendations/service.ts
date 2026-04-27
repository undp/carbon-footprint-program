import type { PrismaClient } from "@repo/database";
import {
  type GetSubcategoryRecommendationsResponse,
  SubcategoryRecommendationModeEnum,
  SubcategoryRecommendationStatus,
  SystemParameterKeyEnum,
} from "@repo/types";
import { getSystemParameterValue } from "@/helpers/getSystemParameterValue.js";
import { CarbonInventoryNotFoundError } from "../errors.js";
import { safeParseCarbonInventoryOrganizationData } from "../utils.js";

export const getSubcategoryRecommendationsService = async (
  prismaClient: PrismaClient,
  carbonInventoryId: string
): Promise<GetSubcategoryRecommendationsResponse> => {
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
    return [];
  }

  const subsectorId = orgData?.subsectorId ?? null;
  const sectorIdBig = BigInt(sectorId);
  const subsectorIdBig = subsectorId ? BigInt(subsectorId) : null;

  const mode = await getSystemParameterValue(
    prismaClient,
    SystemParameterKeyEnum.SUBCATEGORY_RECOMMENDATION_MODE
  );

  if (mode === SubcategoryRecommendationModeEnum.SPECIFIC) {
    // SPECIFIC: prefer the (sectorId, subsectorId) match if any ACTIVE rows
    // exist for it; otherwise fall back to the (sectorId, null) general
    // recommendations. When the org has no subsector, only the general
    // recommendations apply.
    if (subsectorIdBig !== null) {
      const specific = await prismaClient.subcategoryRecommendation.findMany({
        where: {
          sectorId: sectorIdBig,
          subsectorId: subsectorIdBig,
          status: SubcategoryRecommendationStatus.ACTIVE,
        },
        select: { subcategoryId: true },
      });

      if (specific.length > 0) {
        return [...new Set(specific.map((r) => r.subcategoryId.toString()))];
      }
    }

    const general = await prismaClient.subcategoryRecommendation.findMany({
      where: {
        sectorId: sectorIdBig,
        subsectorId: null,
        status: SubcategoryRecommendationStatus.ACTIVE,
      },
      select: { subcategoryId: true },
    });
    return [...new Set(general.map((r) => r.subcategoryId.toString()))];
  }

  // UNION: merge the org's specific subsector match with the general
  // (subsectorId = null) recommendations.
  const recommendations = await prismaClient.subcategoryRecommendation.findMany(
    {
      where: {
        sectorId: sectorIdBig,
        OR: [{ subsectorId: subsectorIdBig }, { subsectorId: null }],
        status: SubcategoryRecommendationStatus.ACTIVE,
      },
      select: { subcategoryId: true },
    }
  );

  return [...new Set(recommendations.map((r) => r.subcategoryId.toString()))];
};
