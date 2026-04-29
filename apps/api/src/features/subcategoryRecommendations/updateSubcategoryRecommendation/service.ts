import type { PrismaClient } from "@repo/database";
import {
  SubcategoryRecommendationStatus,
  type UpdateSubcategoryRecommendationRequest,
  type UpdateSubcategoryRecommendationResponse,
  type User,
} from "@repo/types";
import { difference } from "lodash-es";
import { DataIntegrityError } from "@/errors/DataIntegrityError.js";
import { UserNotFoundError } from "../../users/errors.js";
import { methodologyVersionFilter } from "../helpers.js";

export const updateSubcategoryRecommendationService = async (
  prismaClient: PrismaClient,
  data: UpdateSubcategoryRecommendationRequest,
  user: User | null
): Promise<UpdateSubcategoryRecommendationResponse> => {
  if (!user) {
    throw new UserNotFoundError();
  }

  const methodologyVersionId = BigInt(data.methodologyId);
  const sectorId = BigInt(data.sectorId);
  const subsectorId =
    data.subsectorId !== null ? BigInt(data.subsectorId) : null;
  const userId = BigInt(user.id);

  return prismaClient.$transaction(async (tx) => {
    const existingRows = await tx.subcategoryRecommendation.findMany({
      where: {
        sectorId,
        subsectorId,
        status: SubcategoryRecommendationStatus.ACTIVE,
        ...methodologyVersionFilter(data.methodologyId),
      },
      select: { id: true, subcategoryId: true },
    });

    const existingIds = existingRows.map((row) => row.subcategoryId.toString());
    const idsToRemove = difference(existingIds, data.subcategoryIds);
    const idsToAdd = difference(data.subcategoryIds, existingIds);

    if (idsToAdd.length > 0) {
      const matchingSubcategories = await tx.subcategory.count({
        where: {
          id: { in: idsToAdd.map((id) => BigInt(id)) },
          category: { methodologyVersionId },
        },
      });

      if (matchingSubcategories !== idsToAdd.length) {
        throw new DataIntegrityError(
          "One or more subcategoryIds do not belong to the given methodology"
        );
      }
    }

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
