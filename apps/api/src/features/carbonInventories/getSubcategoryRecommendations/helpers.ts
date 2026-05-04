import {
  SubcategoryRecommendationStatus,
  type Prisma,
  type PrismaClient,
} from "@repo/database";
import { type GetSubcategoryRecommendationsResponse } from "@repo/types";

export const findRecommendations = async (
  prismaClient: PrismaClient,
  where: Prisma.SubcategoryRecommendationWhereInput
): Promise<GetSubcategoryRecommendationsResponse> => {
  const rows = await prismaClient.subcategoryRecommendation.findMany({
    where: {
      status: SubcategoryRecommendationStatus.ACTIVE,
      ...where,
    },
    select: { subcategoryId: true },
  });
  return [...new Set(rows.map((r) => r.subcategoryId.toString()))];
};
