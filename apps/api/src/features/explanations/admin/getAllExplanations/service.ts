import type { PrismaClient } from "@repo/database";
import type { GetAllExplanationsResponse, User } from "@repo/types";
import { EXPLANATION_CATALOG, type ExplanationSlug } from "@repo/constants";
import { mapExplanationToResponse } from "../../mappers.js";

export const getAllExplanationsService = async (
  prismaClient: PrismaClient,
  _query: null,
  _user: User | null
): Promise<GetAllExplanationsResponse> => {
  const catalogSlugs = Object.keys(EXPLANATION_CATALOG) as ExplanationSlug[];

  const explanations = await prismaClient.explanation.findMany({
    where: { slug: { in: catalogSlugs } },
    orderBy: { name: "asc" },
    select: {
      slug: true,
      name: true,
      description: true,
      content: true,
      createdAt: true,
      updatedAt: true,
      updatedById: true,
    },
  });

  return explanations.map(mapExplanationToResponse);
};
