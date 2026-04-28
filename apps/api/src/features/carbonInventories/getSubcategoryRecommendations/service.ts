import { type PrismaClient } from "@repo/database";
import {
  type GetSubcategoryRecommendationsResponse,
  SubcategoryRecommendationModeEnum,
  SystemParameterKeyEnum,
} from "@repo/types";
import { getSystemParameterValue } from "@/helpers/getSystemParameterValue.js";
import { CarbonInventoryNotFoundError } from "../errors.js";
import { safeParseCarbonInventoryOrganizationData } from "../utils.js";
import { findRecommendations } from "./helpers.js";

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

  if (mode === SubcategoryRecommendationModeEnum.UNION) {
    // Union of subsector-specific and general (null subsector) recommendations.
    return findRecommendations(prismaClient, {
      sectorId: sectorIdBig,
      OR: [{ subsectorId: subsectorIdBig }, { subsectorId: null }],
    });
  }

  // SPECIFIC: prefer subsector-specific recommendations; fall back to general.
  const specific = await findRecommendations(prismaClient, {
    sectorId: sectorIdBig,
    subsectorId: subsectorIdBig,
  });
  if (specific.length > 0) {
    return specific;
  }
  return findRecommendations(prismaClient, {
    sectorId: sectorIdBig,
    subsectorId: null,
  });
};
