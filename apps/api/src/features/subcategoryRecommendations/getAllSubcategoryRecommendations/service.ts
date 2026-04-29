import type { PrismaClient } from "@repo/database";
import {
  SubcategoryRecommendationStatus,
  type GetAllSubcategoryRecommendationsQuery,
  type GetAllSubcategoryRecommendationsResponse,
  type User,
} from "@repo/types";
import {
  activeRecommendationRowSelect,
  buildGroupedResponse,
  methodologyVersionFilter,
} from "../helpers.js";

import { resolveDefaultCountryId } from "@/helpers/resolveDefaultCountryId.js";

export const getAllSubcategoryRecommendationsService = async (
  prismaClient: PrismaClient,
  query: GetAllSubcategoryRecommendationsQuery | null,
  _user: User | null
): Promise<GetAllSubcategoryRecommendationsResponse> => {
  const countryId = await resolveDefaultCountryId(prismaClient);

  const rows = await prismaClient.subcategoryRecommendation.findMany({
    where: {
      status: SubcategoryRecommendationStatus.ACTIVE,
      sector: { countryId },
      ...(query ? methodologyVersionFilter(query.methodologyId) : {}),
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
