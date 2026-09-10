import { Prisma } from "@repo/database";
import { CategoryStatus, SubcategoryStatus } from "@repo/types";

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
 * The parent category lock is not enough on its own. `updateSubcategory` locks
 * only the *destination* category when a subcategory moves, so a transaction
 * moving a row out of category C never contends with a lock on C: the row can
 * be reassigned to another category between the same-category check and the
 * position writes, and the writes then land on a row that no longer lives
 * where the caller decided it did. Locking the rows themselves closes that
 * window — a concurrent update either commits before the lock is granted and
 * is seen by the caller, or waits until this transaction ends.
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
