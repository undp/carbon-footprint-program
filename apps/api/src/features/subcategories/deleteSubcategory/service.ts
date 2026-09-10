import type { PrismaClient } from "@repo/database";
import { SubcategoryStatus, User } from "@repo/types";
import { SubcategoryNotFoundError } from "../errors.js";
import { UserNotFoundError } from "../../users/errors.js";
import { softDeleteSubcategoryDependents } from "../../../helpers/softDeleteSubcategoryDependents.js";
import { lockCategory } from "../helpers.js";

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
    // sequence has to stay contiguous. Positions are user-visible now (the
    // "Pos." column, the Excel export, the docs' 1..N tables) and the seed
    // rejects authored gaps, so leaving a hole behind every delete would put
    // the two maintainer grids at odds.
    //
    // Fetched sorted by position ASC so each row moves into a slot already
    // freed by the previous update: PostgreSQL checks the partial unique index
    // after each row, not after the full statement, so a bulk updateMany would
    // violate it.
    const toShift = await tx.subcategory.findMany({
      where: {
        categoryId: subcategory.categoryId,
        status: SubcategoryStatus.ACTIVE,
        position: { gt: subcategory.position },
      },
      select: { id: true },
      orderBy: { position: "asc" },
    });

    for (const sibling of toShift) {
      await tx.subcategory.update({
        where: { id: sibling.id },
        data: { position: { decrement: 1 }, updatedById: BigInt(user.id) },
      });
    }
  });
};
