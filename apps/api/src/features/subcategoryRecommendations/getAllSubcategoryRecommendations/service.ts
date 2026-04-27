import type { PrismaClient } from "@repo/database";
import {
  SubcategoryRecommendationStatus,
  type GetAllSubcategoryRecommendationsResponse,
  type User,
} from "@repo/types";
import {
  activeRecommendationRowSelect,
  buildGroupedResponse,
  resolveDefaultCountryId,
} from "../helpers.js";

export const getAllSubcategoryRecommendationsService = async (
  prismaClient: PrismaClient,
  _query: null,
  _user: User | null
): Promise<GetAllSubcategoryRecommendationsResponse> => {
  const countryId = await resolveDefaultCountryId(prismaClient);

  const rows = await prismaClient.subcategoryRecommendation.findMany({
    where: {
      status: SubcategoryRecommendationStatus.ACTIVE,
      sector: { countryId },
    },
    select: activeRecommendationRowSelect,
    orderBy: [
      { sectorId: "asc" },
      { subsectorId: "asc" },
      { subcategoryId: "asc" },
    ],
  });

  return buildGroupedResponse(rows);
};
