import type { PrismaClient } from "@repo/database";
import {
  SubcategoryRecommendationStatus,
  type ListSubcategoryRecommendationsResponse,
} from "@repo/types";
import { buildGroupedResponse, resolveDefaultCountryId } from "../helpers.js";

export const listSubcategoryRecommendationsService = async (
  prismaClient: PrismaClient
): Promise<ListSubcategoryRecommendationsResponse> => {
  const countryId = await resolveDefaultCountryId(prismaClient);

  const rows = await prismaClient.subcategoryRecommendation.findMany({
    where: {
      status: SubcategoryRecommendationStatus.ACTIVE,
      sector: { countryId },
    },
    select: {
      sectorId: true,
      subsectorId: true,
      subcategoryId: true,
      sector: { select: { id: true, name: true } },
      subsector: { select: { id: true, name: true } },
    },
    orderBy: [
      { sectorId: "asc" },
      { subsectorId: "asc" },
      { subcategoryId: "asc" },
    ],
  });

  return buildGroupedResponse(rows);
};
