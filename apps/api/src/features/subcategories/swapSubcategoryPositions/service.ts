import { type PrismaClient } from "@repo/database";
import {
  CategoryStatus,
  SubcategoryStatus,
  User,
  type SwapSubcategoryPositionsRequest,
  type SwapSubcategoryPositionsResponse,
} from "@repo/types";
import { mapSubcategoryToBase } from "../mappers.js";
import {
  SubcategoryNotFoundError,
  SameSubcategoryError,
  SubcategoriesFromDifferentCategoriesError,
  CategoryNotFoundForSubcategoryError,
} from "../errors.js";
import { lockCategory, lockSubcategories } from "../helpers.js";

export const swapSubcategoryPositionsService = async (
  prismaClient: PrismaClient,
  data: SwapSubcategoryPositionsRequest,
  _user: User | null
): Promise<SwapSubcategoryPositionsResponse> => {
  const idA = BigInt(data.subcategoryIdA);
  const idB = BigInt(data.subcategoryIdB);

  if (idA === idB) {
    throw new SameSubcategoryError();
  }

  const [updatedA, updatedB] = await prismaClient.$transaction(async (tx) => {
    /** Both ids have to resolve, or the request names a subcategory that is
     * not there. Applied to the unlocked read and again to the locked one. */
    const requireBoth = <T extends { id: bigint }>(rows: T[]) => {
      const rowA = rows.find((row) => row.id === idA);
      const rowB = rows.find((row) => row.id === idB);

      if (!rowA || !rowB) {
        const missingIds = [];
        if (!rowA) missingIds.push(idA);
        if (!rowB) missingIds.push(idB);
        throw new SubcategoryNotFoundError(missingIds.join(", "));
      }

      return [rowA, rowB] as const;
    };

    // Unlocked, and used for one thing only: finding the category to lock.
    // Every decision it could support is taken again below against the locked
    // rows.
    const found = await tx.subcategory.findMany({
      where: {
        id: { in: [idA, idB] },
        status: { not: SubcategoryStatus.DELETED },
      },
      select: { id: true, categoryId: true },
    });

    const [foundA, foundB] = requireBoth(found);

    if (foundA.categoryId !== foundB.categoryId) {
      throw new SubcategoriesFromDifferentCategoriesError(
        idA.toString(),
        idB.toString()
      );
    }

    // The parent category is locked for the same reason createSubcategory
    // locks it: the temporary position below is MAX + 1, exactly the position
    // a concurrent create would claim. Without the lock the two collide on the
    // partial unique index.
    const categoryId = foundA.categoryId;
    const category = await lockCategory(tx, categoryId);

    if (!category || category.status !== CategoryStatus.ACTIVE) {
      // A concurrent deleteCategory cascades DELETED to its subcategories, so
      // reordering inside a category that is no longer ACTIVE would write
      // positions into soft-deleted rows.
      throw new CategoryNotFoundForSubcategoryError();
    }

    // The category lock does not cover the rows themselves: updateSubcategory
    // locks only the category a subcategory moves *to*, so it never contends
    // with the lock above and can move a row out of this category — or
    // deleteCategory can soft-delete both — between the unlocked read and the
    // writes below. Locking the two rows and re-reading them is what makes the
    // positions, the parent category and the statuses used from here on the
    // committed truth.
    const locked = await lockSubcategories(tx, [idA, idB]);

    const [lockedA, lockedB] = requireBoth(
      locked.filter((row) => row.status !== SubcategoryStatus.DELETED)
    );

    if (
      lockedA.categoryId !== categoryId ||
      lockedB.categoryId !== categoryId
    ) {
      // Either the pair never shared a category — the read that said so was
      // unlocked — or it was moved out of the locked one while this
      // transaction waited. Both mean the order the client is reordering
      // against is stale, so the swap is refused instead of being applied
      // under a category lock that no longer covers these rows.
      throw new SubcategoriesFromDifferentCategoriesError(
        idA.toString(),
        idB.toString()
      );
    }

    const positionA = lockedA.position;
    const positionB = lockedB.position;

    const aggregate = await tx.subcategory.aggregate({
      where: {
        categoryId,
        status: { not: SubcategoryStatus.DELETED },
      },
      _max: { position: true },
    });
    const tempPosition = (aggregate._max.position ?? 0) + 1;

    // Step 1: move A out of the way
    await tx.subcategory.update({
      where: { id: idA },
      data: { position: tempPosition },
    });
    // Step 2: move B to A's original position
    const bUpdated = await tx.subcategory.update({
      where: { id: idB },
      data: { position: positionA },
    });
    // Step 3: move A to B's original position
    const aUpdated = await tx.subcategory.update({
      where: { id: idA },
      data: { position: positionB },
    });

    return [aUpdated, bUpdated] as const;
  });

  return {
    subcategories: [
      mapSubcategoryToBase(updatedA),
      mapSubcategoryToBase(updatedB),
    ],
  };
};
