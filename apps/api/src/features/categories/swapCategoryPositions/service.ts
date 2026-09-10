import { type PrismaClient } from "@repo/database";
import {
  CategoryStatus,
  MethodologyVersionStatus,
  User,
  type SwapCategoryPositionsRequest,
  type SwapCategoryPositionsResponse,
} from "@repo/types";
import { mapCategoryToResponse } from "../mappers.js";
import {
  CategoryNotFoundError,
  CategoriesFromDifferentMethodologyVersionsError,
  MethodologyVersionNotFoundForCategoryError,
  SameCategoryError,
} from "../errors.js";
import { UserNotFoundError } from "../../users/errors.js";
import {
  lockCategories,
  lockMethodologyVersion,
  rethrowCategoryUniqueViolation,
} from "../helpers.js";

export const swapCategoryPositionsService = async (
  prismaClient: PrismaClient,
  data: SwapCategoryPositionsRequest,
  user: User | null
): Promise<SwapCategoryPositionsResponse> => {
  // TODO: remove this if when handlerFactory folder is improved
  if (!user) {
    throw new UserNotFoundError();
  }

  const idA = BigInt(data.categoryIdA);
  const idB = BigInt(data.categoryIdB);

  if (idA === idB) {
    throw new SameCategoryError();
  }

  try {
    const [updatedA, updatedB] = await prismaClient.$transaction(async (tx) => {
      /** Both ids have to resolve, or the request names a category that is not
       * there. Applied to the unlocked read and again to the locked one. */
      const requireBoth = <T extends { id: bigint }>(rows: T[]) => {
        const rowA = rows.find((row) => row.id === idA);
        const rowB = rows.find((row) => row.id === idB);

        if (!rowA || !rowB) {
          const missingIds = [];
          if (!rowA) missingIds.push(idA);
          if (!rowB) missingIds.push(idB);
          throw new CategoryNotFoundError(missingIds.join(", "));
        }

        return [rowA, rowB] as const;
      };

      // Unlocked, and used for one thing only: finding the methodology version
      // to lock. Every decision it could support is taken again below against
      // the locked rows.
      const found = await tx.category.findMany({
        where: {
          id: { in: [idA, idB] },
          status: { not: CategoryStatus.DELETED },
        },
        select: { id: true, methodologyVersionId: true },
      });

      const [foundA, foundB] = requireBoth(found);

      if (foundA.methodologyVersionId !== foundB.methodologyVersionId) {
        throw new CategoriesFromDifferentMethodologyVersionsError(
          idA.toString(),
          idB.toString()
        );
      }

      // The parent methodology version is locked for the same reason
      // swapSubcategoryPositions locks the parent category: the temporary
      // position below is MAX + 1, exactly the position a concurrent
      // createCategory would claim, and both are checked against the same
      // partial unique index.
      const methodologyVersionId = foundA.methodologyVersionId;
      const methodologyVersionStatus = await lockMethodologyVersion(
        tx,
        methodologyVersionId
      );

      if (
        !methodologyVersionStatus ||
        methodologyVersionStatus === MethodologyVersionStatus.DELETED
      ) {
        throw new MethodologyVersionNotFoundForCategoryError();
      }

      // The methodology version lock does not cover the rows themselves: their
      // positions came from the read above, which had no lock, so a concurrent
      // reorder can have swapped them and a concurrent delete can have
      // soft-deleted either one. Locking the two rows and re-reading them is
      // what makes the positions and the statuses used from here on the
      // committed truth.
      const locked = await lockCategories(tx, [idA, idB]);

      const [lockedA, lockedB] = requireBoth(
        locked.filter((row) => row.status !== CategoryStatus.DELETED)
      );

      if (
        lockedA.methodologyVersionId !== methodologyVersionId ||
        lockedB.methodologyVersionId !== methodologyVersionId
      ) {
        // Unreachable while no path moves a category between methodology
        // versions, and checked anyway: the pair was read without a lock, and
        // every write below assumes the lock above covers both rows.
        throw new CategoriesFromDifferentMethodologyVersionsError(
          idA.toString(),
          idB.toString()
        );
      }

      const positionA = lockedA.position;
      const positionB = lockedB.position;

      // Find a safe temp position to avoid the unique constraint during the
      // swap. Same slot a create would claim, which is why the methodology
      // version is locked above.
      const aggregate = await tx.category.aggregate({
        where: {
          methodologyVersionId,
          status: { not: CategoryStatus.DELETED },
        },
        _max: { position: true },
      });
      const tempPosition = (aggregate._max.position ?? 0) + 1;

      // Step 1: Move A out of the way
      await tx.category.update({
        where: { id: idA },
        data: { position: tempPosition },
      });
      // Steps 2 and 3 leave each row at its final position, so they are the
      // writes that stamp the actor. `updatedAt` is bumped by Prisma on all
      // three, and the response exposes it next to `updatedById`: without the
      // actor the pair reads "updated just now, by whoever edited it last".
      const updatedById = BigInt(user.id);

      // Step 2: Move B to A's original position
      const bUpdated = await tx.category.update({
        where: { id: idB },
        data: { position: positionA, updatedById },
      });
      // Step 3: Move A to B's original position
      const aUpdated = await tx.category.update({
        where: { id: idA },
        data: { position: positionB, updatedById },
      });

      return [aUpdated, bUpdated] as const;
    });

    return {
      categories: [
        mapCategoryToResponse(updatedA),
        mapCategoryToResponse(updatedB),
      ],
    };
  } catch (error) {
    rethrowCategoryUniqueViolation(error);
  }
};
