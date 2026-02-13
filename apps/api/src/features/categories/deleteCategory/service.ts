import type { PrismaClient } from "@repo/database";
import { CategoryStatus } from "@repo/types";
import { CategoryNotFoundError } from "../errors.js";

export const deleteCategoryService = async (
  prismaClient: PrismaClient,
  id: string
): Promise<void> => {
  const categoryId = BigInt(id);

  const category = await prismaClient.category.findUnique({
    where: { id: categoryId },
    select: { status: true },
  });

  if (!category || category.status === CategoryStatus.DELETED) {
    throw new CategoryNotFoundError();
  }

  await prismaClient.category.update({
    where: { id: categoryId },
    data: {
      status: CategoryStatus.DELETED,
      updatedById: null, // TODO: Add from authenticated user
    },
  });
};
