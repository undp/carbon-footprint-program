import type { PrismaClient } from "@repo/database";
import { CategoryStatus, SubcategoryStatus, User } from "@repo/types";
import { CategoryNotFoundError } from "../errors.js";
import { UserNotFoundError } from "../../users/errors.js";
import { softDeleteSubcategoryDependents } from "../../../helpers/softDeleteSubcategoryDependents.js";

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

  await prismaClient.$transaction(async (tx) => {
    const category = await tx.category.findUnique({
      where: { id: categoryId, status: CategoryStatus.ACTIVE },
      select: { status: true, position: true, methodologyVersionId: true },
    });

    if (!category) {
      throw new CategoryNotFoundError();
    }

    await tx.category.update({
      where: { id: categoryId },
      data: {
        status: CategoryStatus.DELETED,
        updatedById: BigInt(user.id),
      },
    });

    await softDeleteSubcategoryDependents(tx, { categoryId }, BigInt(user.id));

    await tx.subcategory.updateMany({
      where: {
        categoryId,
        status: SubcategoryStatus.ACTIVE,
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
