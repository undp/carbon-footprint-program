import type { PrismaClient } from "@repo/database";
import { SubCategoryStatus, User } from "@repo/types";
import { SubcategoryNotFoundError } from "../errors.js";
import { UserNotFoundError } from "../../users/errors.js";

export const deleteSubcategoryService = async (
  prismaClient: PrismaClient,
  id: string,
  user: User | null
): Promise<void> => {
  // TODO: remove this if when handlerFactory folder is improved
  if (!user) {
    throw new UserNotFoundError();
  }

  const subcategoryId = BigInt(id);

  const subcategory = await prismaClient.subcategory.findFirst({
    where: {
      id: subcategoryId,
      status: { not: SubCategoryStatus.DELETED },
    },
    select: { status: true },
  });

  if (!subcategory) {
    throw new SubcategoryNotFoundError();
  }

  await prismaClient.subcategory.update({
    where: { id: subcategoryId },
    data: {
      status: SubCategoryStatus.DELETED,
      updatedById: BigInt(user.id),
    },
  });
};
