import type { PrismaClient } from "@repo/database";
import {
  SubcategoryRecommendationStatus,
  type UpdateSubcategoryRecommendationQuery,
  type UpdateSubcategoryRecommendationRequest,
  type UpdateSubcategoryRecommendationResponse,
  type User,
} from "@repo/types";
import { UserNotFoundError } from "../../users/errors.js";

export const updateSubcategoryRecommendationService = async (
  prismaClient: PrismaClient,
  query: UpdateSubcategoryRecommendationQuery,
  data: UpdateSubcategoryRecommendationRequest,
  user: User | null
): Promise<UpdateSubcategoryRecommendationResponse> => {
  if (!user) {
    throw new UserNotFoundError();
  }

  const sectorId = BigInt(query.sectorId);
  const subsectorId =
    query.subsectorId !== null ? BigInt(query.subsectorId) : null;
  const userId = BigInt(user.id);

  return prismaClient.$transaction(async (tx) => {
    const existingRows = await tx.subcategoryRecommendation.findMany({
      where: {
        sectorId,
        subsectorId,
        status: SubcategoryRecommendationStatus.ACTIVE,
      },
      select: { id: true, subcategoryId: true },
    });

    const existingIds = existingRows.map((row) => row.subcategoryId.toString());

    const toRemove = existingRows.filter(
      (row) => !data.subcategoryIds.includes(row.subcategoryId.toString())
    );
    const toAdd = data.subcategoryIds.filter((id) => !existingIds.includes(id));

    if (toRemove.length > 0) {
      await tx.subcategoryRecommendation.updateMany({
        where: { id: { in: toRemove.map((row) => row.id) } },
        data: {
          status: SubcategoryRecommendationStatus.DELETED,
          updatedById: userId,
        },
      });
    }

    if (toAdd.length > 0) {
      await tx.subcategoryRecommendation.createMany({
        data: toAdd.map((subcategoryId) => ({
          sectorId,
          subsectorId,
          subcategoryId: BigInt(subcategoryId),
          status: SubcategoryRecommendationStatus.ACTIVE,
          createdById: userId,
          updatedAt: null,
        })),
      });
    }

    return {};
  });
};
