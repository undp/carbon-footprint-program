import { type PrismaClient } from "@repo/database";
import {
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
} from "../errors.js";
import { lockCategory } from "../helpers.js";

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
    const found = await tx.subcategory.findMany({
      where: {
        id: { in: [idA, idB] },
        status: { not: SubcategoryStatus.DELETED },
      },
      select: { id: true, categoryId: true },
    });

    const foundA = found.find((subcategory) => subcategory.id === idA);
    const foundB = found.find((subcategory) => subcategory.id === idB);

    if (!foundA || !foundB) {
      const missingIds = [];
      if (!foundA) missingIds.push(idA);
      if (!foundB) missingIds.push(idB);
      throw new SubcategoryNotFoundError(missingIds.join(", "));
    }

    if (foundA.categoryId !== foundB.categoryId) {
      throw new SubcategoriesFromDifferentCategoriesError(
        idA.toString(),
        idB.toString()
      );
    }

    // The parent category is locked for the same reason createSubcategory
    // locks it: the temporary position below is MAX + 1, exactly the position
    // a concurrent create would claim. Without the lock the two collide on the
    // partial unique index. Holding it also means the positions read next
    // cannot shift under us.
    const categoryId = foundA.categoryId;
    await lockCategory(tx, categoryId);

    const [subcategoryA, subcategoryB] = await Promise.all([
      tx.subcategory.findUniqueOrThrow({ where: { id: idA } }),
      tx.subcategory.findUniqueOrThrow({ where: { id: idB } }),
    ]);

    const positionA = subcategoryA.position;
    const positionB = subcategoryB.position;

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
