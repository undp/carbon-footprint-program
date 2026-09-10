import { type PrismaClient } from "@repo/database";
import {
  CategoryStatus,
  User,
  type SwapCategoryPositionsRequest,
  type SwapCategoryPositionsResponse,
} from "@repo/types";
import { mapCategoryToResponse } from "../mappers.js";
import {
  CategoryNotFoundError,
  CategoriesFromDifferentMethodologyVersionsError,
  SameCategoryError,
} from "../errors.js";
import { UserNotFoundError } from "../../users/errors.js";

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

  const [updatedA, updatedB] = await prismaClient.$transaction(async (tx) => {
    const [catA, catB] = await Promise.all([
      tx.category.findFirst({
        where: { id: idA, status: { not: CategoryStatus.DELETED } },
      }),
      tx.category.findFirst({
        where: { id: idB, status: { not: CategoryStatus.DELETED } },
      }),
    ]);

    if (!catA || !catB) {
      const missingIds = [];
      if (!catA) missingIds.push(idA);
      if (!catB) missingIds.push(idB);
      throw new CategoryNotFoundError(missingIds.join(", "));
    }
    if (catA.methodologyVersionId !== catB.methodologyVersionId) {
      throw new CategoriesFromDifferentMethodologyVersionsError(
        catA.id,
        catB.id
      );
    }

    const positionA = catA.position;
    const positionB = catB.position;
    const methodologyVersionId = catA.methodologyVersionId;

    // Find a safe temp position to avoid the unique constraint during the swap
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
};
