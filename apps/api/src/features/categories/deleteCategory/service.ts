import type { PrismaClient } from "@repo/database";
import {
  CategoryStatus,
  EmissionFactorStatus,
  SubcategoryStatus,
  User,
} from "@repo/types";
import { CategoryNotFoundError } from "../errors.js";
import { UserNotFoundError } from "../../users/errors.js";

export const deleteCategoryService = async (
  prismaClient: PrismaClient,
  id: string,
  user: User | null
): Promise<void> => {
  // TODO: remove this if when handlerFactory folder is improved
  if (!user) {
    throw new UserNotFoundError();
  }

  const categoryId = BigInt(id);

  const category = await prismaClient.category.findUnique({
    where: { id: categoryId, status: { not: CategoryStatus.DELETED } },
    select: { status: true, position: true, methodologyVersionId: true },
  });

  if (!category) {
    throw new CategoryNotFoundError();
  }

  await prismaClient.$transaction(async (tx) => {
    await tx.category.update({
      where: { id: categoryId },
      data: {
        status: CategoryStatus.DELETED,
        updatedById: BigInt(user.id),
      },
    });

    await tx.emissionFactor.updateMany({
      where: {
        subcategory: { categoryId },
        status: { not: EmissionFactorStatus.DELETED },
      },
      data: { status: EmissionFactorStatus.DELETED, updatedById: BigInt(user.id) },
    });

    await tx.subcategory.updateMany({
      where: {
        categoryId,
        status: { not: SubcategoryStatus.DELETED },
      },
      data: {
        status: SubcategoryStatus.DELETED,
        updatedById: BigInt(user.id),
      },
    });

    // Fetch affected categories sorted by position ASC so each row moves to a
    // slot already freed by the previous update, avoiding unique constraint
    // violations that a bulk updateMany would cause (PostgreSQL checks the
    // constraint after each row, not after the full statement).
    const toShift = await tx.category.findMany({
      where: {
        methodologyVersionId: category.methodologyVersionId,
        status: CategoryStatus.ACTIVE,
        position: { gt: category.position },
      },
      select: { id: true },
      orderBy: { position: "asc" },
    });

    for (const cat of toShift) {
      await tx.category.update({
        where: { id: cat.id },
        data: { position: { decrement: 1 }, updatedById: BigInt(user.id) },
      });
    }
  });
};
