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
    select: { status: true },
  });

  if (!category) {
    throw new CategoryNotFoundError();
  }

  await prismaClient.category.update({
    where: { id: categoryId },
    data: {
      status: CategoryStatus.DELETED,
      updatedById: user ? BigInt(user.id) : null,
    },
  });
};
