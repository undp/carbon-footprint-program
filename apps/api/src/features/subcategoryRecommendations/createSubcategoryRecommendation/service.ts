import type { PrismaClient } from "@repo/database";
import {
  SubcategoryRecommendationStatus,
  type CreateSubcategoryRecommendationRequest,
  type CreateSubcategoryRecommendationResponse,
  type User,
} from "@repo/types";
import { DatabaseUniqueConstraintViolationError } from "@/errors/DatabaseUniqueConstraintViolationError.js";
import { DataIntegrityError } from "@/errors/DataIntegrityError.js";
import { UserNotFoundError } from "../../users/errors.js";
import { methodologyVersionFilter } from "../helpers.js";

export const createSubcategoryRecommendationService = async (
  prismaClient: PrismaClient,
  data: CreateSubcategoryRecommendationRequest,
  user: User | null
): Promise<CreateSubcategoryRecommendationResponse> => {
  if (!user) {
    throw new UserNotFoundError();
  }

  const methodologyVersionId = BigInt(data.methodologyId);
  const sectorId = BigInt(data.sectorId);
  const subsectorId = data.subsectorId ? BigInt(data.subsectorId) : null;
  const userId = BigInt(user.id);
  const subcategoryIds = data.subcategoryIds.map((id) => BigInt(id));

  return prismaClient.$transaction(async (tx) => {
    const matchingSubcategories = await tx.subcategory.count({
      where: {
        id: { in: subcategoryIds },
        category: { methodologyVersionId },
      },
    });

    if (matchingSubcategories !== subcategoryIds.length) {
      throw new DataIntegrityError(
        "One or more subcategoryIds do not belong to the given methodology"
      );
    }

    const existingActive = await tx.subcategoryRecommendation.findFirst({
      where: {
        sectorId,
        subsectorId,
        status: SubcategoryRecommendationStatus.ACTIVE,
        ...methodologyVersionFilter(data.methodologyId),
      },
      select: { id: true },
    });

    if (existingActive) {
      throw new DatabaseUniqueConstraintViolationError();
    }

    // Concurrent inserts that bypass the pre-check are rejected by the
    // partial unique ACTIVE index (P2002); the global error handler maps
    // that to a 409 response.
    await tx.subcategoryRecommendation.createMany({
      data: subcategoryIds.map((subcategoryId) => ({
        sectorId,
        subsectorId,
        subcategoryId,
        status: SubcategoryRecommendationStatus.ACTIVE,
        createdById: userId,
        updatedAt: null,
      })),
    });

    return {};
  });
};
