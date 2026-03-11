import type { PrismaClient } from "@repo/database";
import { SubCategoryStatus, User } from "@repo/types";
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

  const { count } = await prismaClient.subcategory.updateMany({
    where: {
      id: BigInt(subcategoryId),
      status: { not: SubCategoryStatus.DELETED },
    },
    data: {
      status: SubCategoryStatus.DELETED,
      updatedById: BigInt(user.id),
    },
  });

  if (count === 0) {
    throw new SubcategoryNotFoundError();
  }
};
