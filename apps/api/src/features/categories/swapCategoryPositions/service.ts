import { type PrismaClient } from "@repo/database";
import {
  CategoryStatus,
  User,
  type SwapCategoryPositionsRequest,
  type SwapCategoryPositionsResponse,
} from "@repo/types";
import { mapCategoryToResponse } from "../mappers.js";
import { CategoryNotFoundError } from "../errors.js";

export const swapCategoryPositionsService = async (
  prismaClient: PrismaClient,
  data: SwapCategoryPositionsRequest,
  _user: User | null
): Promise<SwapCategoryPositionsResponse> => {
  const idA = BigInt(data.categoryIdA);
  const idB = BigInt(data.categoryIdB);

  const [catA, catB] = await Promise.all([
    prismaClient.category.findFirst({
      where: { id: idA, status: { not: CategoryStatus.DELETED } },
    }),
    prismaClient.category.findFirst({
      where: { id: idB, status: { not: CategoryStatus.DELETED } },
    }),
  ]);

  if (!catA || !catB) {
    throw new CategoryNotFoundError();
  }

  const positionA = catA.position;
  const positionB = catB.position;
  const methodologyVersionId = catA.methodologyVersionId;

  const [updatedA, updatedB] = await prismaClient.$transaction(async (tx) => {
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
    // Step 2: Move B to A's original position
    const bUpdated = await tx.category.update({
      where: { id: idB },
      data: { position: positionA },
    });
    // Step 3: Move A to B's original position
    const aUpdated = await tx.category.update({
      where: { id: idA },
      data: { position: positionB },
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
