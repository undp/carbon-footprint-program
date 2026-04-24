import type { PrismaClient } from "@repo/database";
import { SubcategoryRecommendationStatus } from "@repo/types";
import type { ListSubcategoryRecommendationsResponse } from "@repo/types";
import { buildGroupedResponse } from "../helpers.js";
import { NoCountryFoundError } from "../../methodologies/errors.js";

export const listSubcategoryRecommendationsService = async (
  prismaClient: PrismaClient
): Promise<ListSubcategoryRecommendationsResponse> => {
  // TODO: migrate to DEFAULT_COUNTRY_ID system parameter once available
  const country = await prismaClient.country.findFirst({
    orderBy: { id: "asc" },
  });

  if (!country) {
    throw new NoCountryFoundError();
  }

  const rows = await prismaClient.subcategoryRecommendation.findMany({
    where: {
      status: SubcategoryRecommendationStatus.ACTIVE,
      sector: { countryId: country.id },
    },
    include: {
      sector: { select: { id: true, name: true } },
      subsector: { select: { id: true, name: true } },
    },
    orderBy: [{ sectorId: "asc" }, { subsectorId: "asc" }],
  });

  return buildGroupedResponse(rows);
};
