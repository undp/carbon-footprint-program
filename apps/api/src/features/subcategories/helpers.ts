import { type PrismaClient, Prisma } from "@repo/database";
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
 * The lock is held until the transaction ends, so callers must run inside one.
 *
 * Returns null when no such category row exists.
 */
export async function lockCategory(
  prismaClient: PrismaClient | Prisma.TransactionClient,
  categoryId: bigint
): Promise<LockedCategory | null> {
  const rows = await prismaClient.$queryRaw<LockedCategoryRow[]>`
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
 * Callers must already hold the parent category lock (see `lockCategory`) and
 * hold it until the transaction ends. Without it two concurrent creates in the
 * same category both read the same max under READ COMMITTED, both attempt the
 * same position, and the partial unique index rejects the loser with a 409
 * about a field the client never filled in.
 */
export async function getNextSubcategoryPosition(
  prismaClient: PrismaClient | Prisma.TransactionClient,
  categoryId: bigint
): Promise<number> {
  const { _max } = await prismaClient.subcategory.aggregate({
    where: {
      categoryId,
      status: { not: SubcategoryStatus.DELETED },
    },
    _max: { position: true },
  });

  return (_max.position ?? 0) + 1;
}
