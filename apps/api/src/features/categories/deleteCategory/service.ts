import type { PrismaClient } from "@repo/database";
import { CategoryStatus, SubcategoryStatus, User } from "@repo/types";
import { CategoryNotFoundError } from "../errors.js";
import { UserNotFoundError } from "../../users/errors.js";
import { softDeleteSubcategoryDependents } from "../../../helpers/softDeleteSubcategoryDependents.js";
import {
  lockCategories,
  lockMethodologyVersion,
  repackCategoryPositions,
} from "../helpers.js";

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
    // Unlocked, and used for one thing only: finding the methodology version to
    // lock. The status and the position are read again below, off the locked
    // row.
    const found = await tx.category.findUnique({
      where: { id: categoryId, status: CategoryStatus.ACTIVE },
      select: { methodologyVersionId: true },
    });

    if (!found) {
      throw new CategoryNotFoundError();
    }

    // The repack at the end of this transaction is a writer of category
    // positions, exactly like createCategory and swapCategoryPositions, so it
    // has to queue on the same parent instead of racing them: without this lock
    // a concurrent reorder can move a row this transaction has already decided
    // to shift, and the decrement then collides on
    // category_methodology_version_id_position_active_unique — a P2002 with no
    // catch anywhere in this path, i.e. a 500 on a delete.
    //
    // Locks are taken in the same order as swapCategoryPositions — methodology
    // version, then the rows — so the two cannot deadlock against each other.
    // The version's own status is not checked: soft-deleting a category whose
    // parent was soft-deleted meanwhile is still the right outcome, and the
    // lock is taken for the serialization alone.
    const { methodologyVersionId } = found;
    await lockMethodologyVersion(tx, methodologyVersionId);

    // The position that is about to be freed comes off the locked row, not off
    // the read above: a reorder that committed while this transaction waited
    // for the lock has already moved this category, and repacking from the
    // stale position would close a hole that is not there and leave the real
    // one open.
    const [category] = await lockCategories(tx, [categoryId]);

    if (!category || category.status !== CategoryStatus.ACTIVE) {
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

    await repackCategoryPositions(tx, methodologyVersionId, category.position);
  });
};
