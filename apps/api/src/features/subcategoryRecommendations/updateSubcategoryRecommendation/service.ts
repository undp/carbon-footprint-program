import type { PrismaClient } from "@repo/database";
import {
  SubcategoryRecommendationStatus,
  type UpdateSubcategoryRecommendationQuery,
  type UpdateSubcategoryRecommendationRequest,
  type UpdateSubcategoryRecommendationResponse,
  type User,
} from "@repo/types";
import { difference } from "lodash-es";
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
    const idsToRemove = difference(existingIds, data.subcategoryIds);
    const idsToAdd = difference(data.subcategoryIds, existingIds);

    if (idsToRemove.length > 0) {
      const rowIdsToRemove = existingRows
        .filter((row) => idsToRemove.includes(row.subcategoryId.toString()))
        .map((row) => row.id);

      await tx.subcategoryRecommendation.updateMany({
        where: { id: { in: rowIdsToRemove } },
        data: {
          status: SubcategoryRecommendationStatus.DELETED,
          updatedById: userId,
        },
      });
    }

    if (idsToAdd.length > 0) {
      await tx.subcategoryRecommendation.createMany({
        data: idsToAdd.map((subcategoryId) => ({
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
