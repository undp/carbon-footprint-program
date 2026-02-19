import type { PrismaClient } from "@repo/database";
import { CategoryStatus, User } from "@repo/types";
import { CategoryNotFoundError } from "../errors.js";

export const deleteCategoryService = async (
  prismaClient: PrismaClient,
  id: string,
  user: User | null
): Promise<void> => {
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
        updatedById: user ? BigInt(user.id) : null,
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
        data: { position: { decrement: 1 } },
      });
    }
  });
};
