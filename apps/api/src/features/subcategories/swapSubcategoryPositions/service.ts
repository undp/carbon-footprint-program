import { type PrismaClient } from "@repo/database";
import {
  SubcategoryStatus,
  User,
  type SwapSubcategoryPositionsRequest,
  type SwapSubcategoryPositionsResponse,
} from "@repo/types";
import {
  SubcategoryNotFoundError,
  SubcategoriesFromDifferentCategoriesError,
  SameSubcategoryError,
} from "../errors.js";

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
    const [subA, subB] = await Promise.all([
      tx.subcategory.findFirst({
        where: { id: idA, status: { not: SubcategoryStatus.DELETED } },
      }),
      tx.subcategory.findFirst({
        where: { id: idB, status: { not: SubcategoryStatus.DELETED } },
      }),
    ]);

    if (!subA || !subB) {
      const missingIds = [];
      if (!subA) missingIds.push(idA);
      if (!subB) missingIds.push(idB);
      throw new SubcategoryNotFoundError(missingIds.join(", "));
    }
    if (subA.categoryId !== subB.categoryId) {
      throw new SubcategoriesFromDifferentCategoriesError(subA.id, subB.id);
    }

    const positionA = subA.position;
    const positionB = subB.position;
    const categoryId = subA.categoryId;

    // Find a safe temp position to avoid the unique constraint during the swap
    const aggregate = await tx.subcategory.aggregate({
      where: {
        categoryId,
        status: { not: SubcategoryStatus.DELETED },
      },
      _max: { position: true },
    });
    const tempPosition = (aggregate._max.position ?? 0) + 1;

    // Step 1: Move A out of the way
    await tx.subcategory.update({
      where: { id: idA },
      data: { position: tempPosition },
    });
    // Step 2: Move B to A's original position
    const bUpdated = await tx.subcategory.update({
      where: { id: idB },
      data: { position: positionA },
    });
    // Step 3: Move A to B's original position
    const aUpdated = await tx.subcategory.update({
      where: { id: idA },
      data: { position: positionB },
    });

    return [aUpdated, bUpdated] as const;
  });

  return {
    subcategories: [
      {
        id: updatedA.id.toString(),
        categoryId: updatedA.categoryId.toString(),
        name: updatedA.name,
        position: updatedA.position,
      },
      {
        id: updatedB.id.toString(),
        categoryId: updatedB.categoryId.toString(),
        name: updatedB.name,
        position: updatedB.position,
      },
    ],
  };
};
