import { Prisma, type PrismaClient } from "@repo/database";
import { SubcategoryRecommendationStatus } from "@repo/types";
import type {
  CreateSubcategoryRecommendationBody,
  CreateSubcategoryRecommendationResponse,
  User,
} from "@repo/types";
import { buildGroupedResponse } from "../helpers.js";
import { SubcategoryRecommendationGroupAlreadyExistsError } from "../errors.js";

export const createSubcategoryRecommendationService = async (
  prismaClient: PrismaClient,
  data: CreateSubcategoryRecommendationBody,
  user: User | null
): Promise<CreateSubcategoryRecommendationResponse> => {
  const sectorId = BigInt(data.sectorId);
  const subsectorId =
    data.subsectorId !== null ? BigInt(data.subsectorId) : null;
  const userId = user ? BigInt(user.id) : null;

  const group = await prismaClient.$transaction(async (tx) => {
    const existing = await tx.subcategoryRecommendation.findFirst({
      where: {
        sectorId,
        subsectorId,
        status: SubcategoryRecommendationStatus.ACTIVE,
      },
    });

    if (existing) {
      throw new SubcategoryRecommendationGroupAlreadyExistsError();
    }

    try {
      await tx.subcategoryRecommendation.createMany({
        data: data.subcategoryIds.map((subcategoryId) => ({
          subcategoryId: BigInt(subcategoryId),
          sectorId,
          subsectorId,
          status: SubcategoryRecommendationStatus.ACTIVE,
          createdById: userId,
        })),
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new SubcategoryRecommendationGroupAlreadyExistsError();
      }
      throw error;
    }

    return tx.subcategoryRecommendation.findMany({
      where: {
        sectorId,
        subsectorId,
        status: SubcategoryRecommendationStatus.ACTIVE,
      },
      include: {
        sector: { select: { id: true, name: true } },
        subsector: { select: { id: true, name: true } },
      },
    });
  });

  const [result] = buildGroupedResponse(group);
  return result!;
};
