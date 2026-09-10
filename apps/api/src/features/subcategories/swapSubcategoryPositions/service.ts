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
import { UserNotFoundError } from "../../users/errors.js";
import {
  getNextSubcategoryPosition,
  lockCategory,
  lockSubcategories,
  rethrowSubcategoryUniqueViolation,
} from "../helpers.js";

export const swapSubcategoryPositionsService = async (
  prismaClient: PrismaClient,
  data: SwapSubcategoryPositionsRequest,
  user: User | null
): Promise<SwapSubcategoryPositionsResponse> => {
  // TODO: remove this if when handlerFactory folder is improved
  if (!user) {
    throw new UserNotFoundError();
  }

  const idA = BigInt(data.subcategoryIdA);
  const idB = BigInt(data.subcategoryIdB);

  if (idA === idB) {
    throw new SameSubcategoryError();
  }

  try {
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

      // The category lock does not cover the rows themselves: an
      // updateSubcategory can move a row out of this category — it takes this
      // same lock on a move, so the two paths queue instead of racing, but it
      // can have committed before this one got the lock — or a deleteCategory
      // can soft-delete both, either of them between the unlocked read and the
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

      // Same slot a create would claim, which is why the category is locked
      // above.
      const tempPosition = await getNextSubcategoryPosition(tx, categoryId);

      // Step 1: move A out of the way
      await tx.subcategory.update({
        where: { id: idA },
        data: { position: tempPosition },
      });
      // Steps 2 and 3 leave each row at its final position, so they are the
      // writes that stamp the actor. `updatedAt` is bumped by Prisma on all
      // three, and the response exposes it next to `updatedById`: without the
      // actor the pair reads "updated just now, by whoever edited it last".
      const updatedById = BigInt(user.id);

      // Step 2: move B to A's original position
      const bUpdated = await tx.subcategory.update({
        where: { id: idB },
        data: { position: positionA, updatedById },
      });
      // Step 3: move A to B's original position
      const aUpdated = await tx.subcategory.update({
        where: { id: idA },
        data: { position: positionB, updatedById },
      });

      return [aUpdated, bUpdated] as const;
    });

    return {
      subcategories: [
        mapSubcategoryToBase(updatedA),
        mapSubcategoryToBase(updatedB),
      ],
    };
  } catch (error) {
    rethrowSubcategoryUniqueViolation(error);
  }
};
