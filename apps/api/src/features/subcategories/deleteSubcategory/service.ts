import type { PrismaClient } from "@repo/database";
import { SubcategoryStatus, User } from "@repo/types";
import { SubcategoryNotFoundError } from "../errors.js";
import { UserNotFoundError } from "../../users/errors.js";
import { softDeleteSubcategoryDependents } from "../../../helpers/softDeleteSubcategoryDependents.js";
import { lockCategory, repackSubcategoryPositions } from "../helpers.js";

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
      select: { status: true, categoryId: true, position: true },
    });

    if (!subcategory) {
      throw new SubcategoryNotFoundError();
    }

    // The repack below moves the highest position in the category, which is
    // exactly what createSubcategory and the swap read as MAX + 1 under this
    // same lock. Without it a concurrent create keeps the pre-repack MAX and
    // reopens the gap this transaction just closed.
    await lockCategory(tx, subcategory.categoryId);

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

    // Same repack as deleteCategory, for the same reason it exists there: the
    // sequence has to stay contiguous. Shared with updateSubcategory, which
    // frees a position the same way when a subcategory moves out — see
    // repackSubcategoryPositions.
    await repackSubcategoryPositions(
      tx,
      subcategory.categoryId,
      subcategory.position
    );
  });
};
