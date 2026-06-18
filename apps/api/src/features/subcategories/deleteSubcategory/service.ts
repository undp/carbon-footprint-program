import type { PrismaClient } from "@repo/database";
import { SubcategoryStatus, User } from "@repo/types";
import { SubcategoryNotFoundError } from "../errors.js";
import { UserNotFoundError } from "../../users/errors.js";
import { softDeleteSubcategoryDependents } from "../../../helpers/softDeleteSubcategoryDependents.js";

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

    await softDeleteSubcategoryDependents(
      tx,
      { id: parsedSubcategoryId },
      BigInt(user.id)
    );

    await tx.subcategory.update({
      where: { id: parsedSubcategoryId },
      data: {
        status: SubcategoryStatus.DELETED,
        updatedById: BigInt(user.id),
      },
    });
  });
};
