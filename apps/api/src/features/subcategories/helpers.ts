import { Prisma } from "@repo/database";
import { CategoryStatus, SubcategoryStatus } from "@repo/types";
import { getDuplicatedFieldsFromP2002Error } from "@/errors/index.js";
import {
  SubcategoryNameAlreadyExistsError,
  SubcategoryPositionAlreadyExistsError,
} from "./errors.js";

/**
 * Rethrows a subcategory write failure, turning a unique violation into its
 * 409. Always throws, so the whole `catch` body is one call.
 *
 * The field match is by substring, like createEmissionFactorDimension:
 * depending on the Prisma/adapter version `getDuplicatedFieldsFromP2002Error`
 * yields either the column names or the index name, and an exact match
 * silently turns these 409s into 500s (that arm was dead for months on the
 * dimension service). The two index names are disjoint on these substrings.
 *
 * A position collision is not something a client can cause: every position is
 * either read from a locked row or computed as MAX + 1 under the parent
 * category lock, so it means a position was written outside that path (seed
 * data, a manual fix). It is still surfaced as a 409 rather than a 500 because
 * the row that is in the way is the actionable part.
 */
export function rethrowSubcategoryUniqueViolation(error: unknown): never {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  ) {
    const duplicatedFields = getDuplicatedFieldsFromP2002Error(error);

    if (duplicatedFields.some((field) => field.includes("position"))) {
      throw new SubcategoryPositionAlreadyExistsError();
    }
    if (duplicatedFields.some((field) => field.includes("name"))) {
      throw new SubcategoryNameAlreadyExistsError();
    }
  }

  throw error;
}

interface LockedCategoryRow {
  status: CategoryStatus;
  methodology_version_id: bigint;
}

export interface LockedCategory {
  status: CategoryStatus;
  methodologyVersionId: bigint;
}

/**
 * Locks a category row and returns what subcategory writes need to validate.
 *
 * The lock has to be taken *before* the status is checked, not after. A
 * category read as ACTIVE and only then locked can have been soft-deleted in
 * between: the lock blocks until the deleting transaction commits and then
 * returns the DELETED row to a caller that already made its decision, which
 * leaves an ACTIVE subcategory hanging off a DELETED category — visible in
 * getAllSubcategories (it filters only the subcategory status) and invisible in
 * getMethodologyById and the inventory methodology (they filter ACTIVE
 * categories). Reading `status` off the locked row closes that window: a
 * concurrent soft-delete either commits before the lock is granted and is seen
 * here, or waits until this transaction ends.
 *
 * The lock is only held to the end of the enclosing transaction, so the
 * parameter is the transaction client — outside a transaction Postgres releases
 * the lock as soon as this statement finishes and the guarantee is gone. (The
 * type documents that requirement; a full PrismaClient stays structurally
 * assignable to it, so it is not a hard barrier.)
 *
 * Returns null when no such category row exists.
 */
export async function lockCategory(
  tx: Prisma.TransactionClient,
  categoryId: bigint
): Promise<LockedCategory | null> {
  const rows = await tx.$queryRaw<LockedCategoryRow[]>`
    SELECT "status", "methodology_version_id"
    FROM "category"
    WHERE "id" = ${categoryId}
    FOR UPDATE
  `;

  const row = rows[0];

  if (!row) {
    return null;
  }

  return {
    status: row.status,
    methodologyVersionId: row.methodology_version_id,
  };
}

/**
 * Next position inside a category: a subcategory is always appended last.
 *
 * Positions are not supplied by the client. DELETED rows are excluded from both
 * the max and the partial unique index, so the position of a soft-deleted
 * subcategory becomes free again — and `deleteSubcategory` repacks the siblings
 * that follow the deleted row, the way `deleteCategory` does. The live sequence
 * therefore stays contiguous, and MAX + 1 is the slot right after the last row.
 *
 * Callers must already hold the parent category lock (see `lockCategory`),
 * which is why the parameter is the transaction client. Without the lock two
 * concurrent creates in the same category both read the same max under READ
 * COMMITTED, both attempt the same position, and the partial unique index
 * rejects the loser with a 409 about a field the client never filled in.
 */
export async function getNextSubcategoryPosition(
  tx: Prisma.TransactionClient,
  categoryId: bigint
): Promise<number> {
  const { _max } = await tx.subcategory.aggregate({
    where: {
      categoryId,
      status: { not: SubcategoryStatus.DELETED },
    },
    _max: { position: true },
  });

  return (_max.position ?? 0) + 1;
}

/**
 * Closes the hole a subcategory left behind in its category.
 *
 * Shared by `deleteSubcategory` (the row was soft-deleted) and
 * `updateSubcategory` (the row moved to another category): both free one
 * position, and the live sequence has to stay contiguous because positions are
 * user-visible (the "Pos." column, the Excel export, the docs' 1..N tables) and
 * the seed rejects authored gaps.
 *
 * Siblings are fetched sorted by position ASC so each one moves into a slot the
 * previous update already freed: PostgreSQL checks the partial unique index
 * after each row, not after the full statement, so a bulk `updateMany` would
 * violate it.
 *
 * The status predicate is the index's own — every row that is not DELETED — and
 * the same one `getNextSubcategoryPosition` counts. A row this call refused to
 * shift while MAX + 1 counted it would leave a hole the next append lands in.
 *
 * Only `position` is written. Shifting a sibling is bookkeeping, not an edit, so
 * stamping the actor here would report every following subcategory as "modified
 * just now" by whoever deleted or moved one of their siblings, erasing who last
 * edited each one.
 *
 * Callers must already hold the parent category lock (see `lockCategory`), which
 * is why the parameter is the transaction client: without it a concurrent create
 * reads the pre-repack MAX and reopens the gap this call just closed.
 */
export async function repackSubcategoryPositions(
  tx: Prisma.TransactionClient,
  categoryId: bigint,
  freedPosition: number
): Promise<void> {
  const toShift = await tx.subcategory.findMany({
    where: {
      categoryId,
      status: { not: SubcategoryStatus.DELETED },
      position: { gt: freedPosition },
    },
    select: { id: true },
    orderBy: { position: "asc" },
  });

  for (const sibling of toShift) {
    await tx.subcategory.update({
      where: { id: sibling.id },
      data: { position: { decrement: 1 } },
    });
  }
}

interface LockedSubcategoryRow {
  id: bigint;
  category_id: bigint;
  status: SubcategoryStatus;
  position: number;
}

export interface LockedSubcategory {
  id: bigint;
  categoryId: bigint;
  status: SubcategoryStatus;
  position: number;
}

/**
 * Locks subcategory rows and returns what a reorder needs to validate.
 *
 * The parent category lock is not enough on its own, because *which* category
 * to lock comes from an unlocked read: between that read and the lock being
 * granted, a concurrent `updateSubcategory` can have moved the row into or out
 * of that category, or a `deleteSubcategory` can have soft-deleted it. The
 * writes would then land on a row that no longer lives where the caller decided
 * it did. Locking the rows themselves and re-reading them closes that window —
 * a concurrent write either commits before the lock is granted and is seen by
 * the caller, or waits until this transaction ends.
 *
 * Rows are locked in id order so two callers asking for the same pair cannot
 * deadlock against each other, and only existing rows come back — a caller
 * that asked for an id it does not find here has to treat it as missing.
 *
 * Like `lockCategory`, the lock lives only until the enclosing transaction
 * ends, which is why the parameter is the transaction client.
 */
export async function lockSubcategories(
  tx: Prisma.TransactionClient,
  ids: bigint[]
): Promise<LockedSubcategory[]> {
  const rows = await tx.$queryRaw<LockedSubcategoryRow[]>`
    SELECT "id", "category_id", "status", "position"
    FROM "subcategory"
    WHERE "id" IN (${Prisma.join(ids)})
    ORDER BY "id"
    FOR UPDATE
  `;

  return rows.map((row) => ({
    id: row.id,
    categoryId: row.category_id,
    status: row.status,
    position: row.position,
  }));
}
