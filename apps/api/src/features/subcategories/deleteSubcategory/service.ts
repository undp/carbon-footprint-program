import type { PrismaClient } from "@repo/database";
import { SubcategoryStatus, User } from "@repo/types";
import {
  SubcategoryConcurrentlyMovedError,
  SubcategoryNotFoundError,
} from "../errors.js";
import { UserNotFoundError } from "../../users/errors.js";
import { softDeleteSubcategoryDependents } from "../../../helpers/softDeleteSubcategoryDependents.js";
import {
  lockCategory,
  lockSubcategories,
  repackSubcategoryPositions,
} from "../helpers.js";

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
    // Unlocked, and used for one thing only: finding the category to lock. The
    // position the re-pack below is anchored on is read from the locked row.
    const subcategory = await tx.subcategory.findFirst({
      where: {
        status: SubcategoryStatus.ACTIVE,
        id: parsedSubcategoryId,
      },
      select: { categoryId: true },
    });

    if (!subcategory) {
      throw new SubcategoryNotFoundError();
    }

    // The repack below moves the highest position in the category, which is
    // exactly what createSubcategory and the swap read as MAX + 1 under this
    // same lock. Without it a concurrent create keeps the pre-repack MAX and
    // reopens the gap this transaction just closed.
    //
    // The returned row is deliberately ignored, unlike in createSubcategory and
    // the swap: a soft-deleted category with an ACTIVE subcategory still hanging
    // off it is exactly the state this call cleans up, so a DELETED parent must
    // not stop the delete.
    await lockCategory(tx, subcategory.categoryId);

    // Same reason as updateSubcategory: the category was chosen from a read
    // without a lock, so the row is locked and re-read before its position
    // becomes the re-pack anchor. A concurrent swap changes that position, and a
    // concurrent move takes the row out of the category locked above.
    const [lockedSubcategory] = await lockSubcategories(tx, [
      parsedSubcategoryId,
    ]);

    if (
      !lockedSubcategory ||
      lockedSubcategory.status !== SubcategoryStatus.ACTIVE
    ) {
      throw new SubcategoryNotFoundError();
    }

    if (lockedSubcategory.categoryId !== subcategory.categoryId) {
      throw new SubcategoryConcurrentlyMovedError(subcategoryId);
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

    // Same repack as deleteCategory, for the same reason it exists there: the
    // sequence has to stay contiguous. Shared with updateSubcategory, which
    // frees a position the same way when a subcategory moves out — see
    // repackSubcategoryPositions.
    await repackSubcategoryPositions(
      tx,
      lockedSubcategory.categoryId,
      lockedSubcategory.position
    );
  });
};
