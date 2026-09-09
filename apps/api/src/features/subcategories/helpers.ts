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
 * subcategory becomes free again — but only the highest one is ever handed out
 * again: deleting a subcategory in the middle leaves a permanent gap, and gaps
 * accumulate over delete/create cycles. Order is what matters here, not
 * contiguity.
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
