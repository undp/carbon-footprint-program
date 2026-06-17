import type { PrismaClient } from "@repo/database";
import {
  EmissionFactorDimensionStatus,
  EmissionFactorDimensionValueStatus,
  EmissionFactorStatus,
  ReductionPlanInitiativeStatus,
  SubcategoryRecommendationStatus,
  SubcategoryStatus,
  User,
} from "@repo/types";
import { SubcategoryNotFoundError } from "../errors.js";
import { UserNotFoundError } from "../../users/errors.js";

export const deleteSubcategoryService = async (
  prismaClient: PrismaClient,
  subcategoryId: string,
  user: User | null
): Promise<void> => {
  // TODO: remove this if when handlerFactory folder is improved
  if (!user) {
    throw new UserNotFoundError();
  }

  const parsedSubcategoryId = BigInt(subcategoryId);

  await prismaClient.$transaction(async (tx) => {
    const subcategory = await tx.subcategory.findFirst({
      where: {
        status: SubcategoryStatus.ACTIVE,
        id: parsedSubcategoryId,
      },
      select: { status: true },
    });

    if (!subcategory) {
      throw new SubcategoryNotFoundError();
    }

    await tx.emissionFactor.updateMany({
      where: {
        subcategoryId: parsedSubcategoryId,
        status: EmissionFactorStatus.ACTIVE,
      },
      data: {
        status: EmissionFactorStatus.DELETED,
        updatedById: BigInt(user.id),
      },
    });

    await tx.emissionFactorDimensionValue.updateMany({
      where: {
        dimension: { subcategoryId: parsedSubcategoryId },
        status: EmissionFactorDimensionValueStatus.ACTIVE,
      },
      data: {
        status: EmissionFactorDimensionValueStatus.DELETED,
        updatedById: BigInt(user.id),
      },
    });

    await tx.emissionFactorDimension.updateMany({
      where: {
        subcategoryId: parsedSubcategoryId,
        status: EmissionFactorDimensionStatus.ACTIVE,
      },
      data: {
        status: EmissionFactorDimensionStatus.DELETED,
        updatedById: BigInt(user.id),
      },
    });

    await tx.reductionPlanInitiative.updateMany({
      where: {
        subcategoryId: parsedSubcategoryId,
        status: ReductionPlanInitiativeStatus.ACTIVE,
      },
      data: {
        status: ReductionPlanInitiativeStatus.DELETED,
        updatedById: BigInt(user.id),
      },
    });

    await tx.subcategoryRecommendation.updateMany({
      where: {
        subcategoryId: parsedSubcategoryId,
        status: SubcategoryRecommendationStatus.ACTIVE,
      },
      data: {
        status: SubcategoryRecommendationStatus.DELETED,
        updatedById: BigInt(user.id),
      },
    });

    await tx.subcategory.update({
      where: { id: parsedSubcategoryId },
      data: {
        status: SubcategoryStatus.DELETED,
        updatedById: BigInt(user.id),
      },
    });
  });
};
