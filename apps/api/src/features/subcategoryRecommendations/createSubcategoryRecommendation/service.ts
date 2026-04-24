import { type PrismaClient, Prisma } from "@repo/database";
import {
  SubcategoryRecommendationStatus,
  type CreateSubcategoryRecommendationRequest,
  type CreateSubcategoryRecommendationResponse,
  type User,
} from "@repo/types";
import { DatabaseUniqueConstraintViolationError } from "@/errors/DatabaseUniqueConstraintViolationError.js";
import { UserNotFoundError } from "../../users/errors.js";
import { loadGroup } from "../helpers.js";

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

  try {
    return await prismaClient.$transaction(async (tx) => {
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

      const refreshed = await loadGroup(tx, sectorId, subsectorId);
      if (!refreshed) {
        throw new Error(
          "Failed to load the refreshed subcategory recommendation group"
        );
      }
      return refreshed;
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      // Partial unique ACTIVE index rejected a concurrent insert — surface
      // the same 409 the pre-check path returns so both paths collapse into
      // a single error surface.
      throw new DatabaseUniqueConstraintViolationError();
    }
    throw error;
  }
};
