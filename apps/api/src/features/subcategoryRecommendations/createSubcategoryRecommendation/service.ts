import type { PrismaClient } from "@repo/database";
import {
  SubcategoryRecommendationStatus,
  type CreateSubcategoryRecommendationRequest,
  type CreateSubcategoryRecommendationResponse,
  type User,
} from "@repo/types";
import { DatabaseUniqueConstraintViolationError } from "@/errors/DatabaseUniqueConstraintViolationError.js";
import { UserNotFoundError } from "../../users/errors.js";

export const createSubcategoryRecommendationService = async (
  prismaClient: PrismaClient,
  data: CreateSubcategoryRecommendationRequest,
  user: User | null
): Promise<CreateSubcategoryRecommendationResponse> => {
  if (!user) {
    throw new UserNotFoundError();
  }

  const sectorId = BigInt(data.sectorId);
  const subsectorId = data.subsectorId ? BigInt(data.subsectorId) : null;
  const userId = BigInt(user.id);

  return prismaClient.$transaction(async (tx) => {
    const existingActive = await tx.subcategoryRecommendation.findFirst({
      where: {
        sectorId,
        subsectorId,
        status: SubcategoryRecommendationStatus.ACTIVE,
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
      data: data.subcategoryIds.map((subcategoryId) => ({
        sectorId,
        subsectorId,
        subcategoryId: BigInt(subcategoryId),
        status: SubcategoryRecommendationStatus.ACTIVE,
        createdById: userId,
        updatedAt: null,
      })),
    });

    return {};
  });
};
