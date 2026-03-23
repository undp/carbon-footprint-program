import type { PrismaClient } from "@repo/database";
import {
  EmissionFactorDimensionStatus,
  EmissionFactorDimensionValueStatus,
  EmissionFactorStatus,
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

  const subcategory = await prismaClient.subcategory.findFirst({
    where: {
      status: SubcategoryStatus.ACTIVE,
      id: parsedSubcategoryId,
    },
    select: { status: true },
  });

  if (!subcategory) {
    throw new SubcategoryNotFoundError();
  }

  await prismaClient.$transaction(async (tx) => {
    await tx.emissionFactor.updateMany({
      where: {
        subcategoryId: parsedSubcategoryId,
        status: { not: EmissionFactorStatus.DELETED },
      },
      data: { status: EmissionFactorStatus.DELETED, updatedById: BigInt(user.id) },
    });

    await tx.emissionFactorDimensionValue.updateMany({
      where: {
        dimension: { subcategoryId: parsedSubcategoryId },
        status: { not: EmissionFactorDimensionValueStatus.DELETED },
      },
      data: {
        status: EmissionFactorDimensionValueStatus.DELETED,
        updatedById: BigInt(user.id),
      },
    });

    await tx.emissionFactorDimension.updateMany({
      where: {
        subcategoryId: parsedSubcategoryId,
        status: { not: EmissionFactorDimensionStatus.DELETED },
      },
      data: {
        status: EmissionFactorDimensionStatus.DELETED,
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
