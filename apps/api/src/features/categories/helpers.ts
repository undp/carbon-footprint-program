import { Prisma } from "@repo/database";
import { CategoryStatus, MethodologyVersionStatus } from "@repo/types";
import { getDuplicatedFieldsFromP2002Error } from "@/errors/index.js";
import {
  CategoryNameAlreadyExistsError,
  CategoryPositionAlreadyExistsError,
} from "./errors.js";

/**
 * Rethrows a category write failure, turning a unique violation into its 409.
 * Always throws, so the whole `catch` body is one call.
 *
 * The field match is by substring, like `rethrowSubcategoryUniqueViolation` one
 * level down: depending on the Prisma/adapter version
 * `getDuplicatedFieldsFromP2002Error` yields either the column names or the
 * index name, and an exact match silently turns these 409s into 500s. The two
 * index names are disjoint on these substrings.
 *
 * A position collision is not something a client can cause: every position is
 * either read from a locked row or computed as MAX + 1 under the methodology
 * version lock, so it means a position was written outside that path (seed
 * data, a manual fix). It is still surfaced as a 409 rather than a 500 because
 * the row that is in the way is the actionable part — the same call the
 * subcategory helper makes one level down.
 */
export function rethrowCategoryUniqueViolation(error: unknown): never {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  ) {
    const duplicatedFields = getDuplicatedFieldsFromP2002Error(error);

    if (duplicatedFields.some((field) => field.includes("position"))) {
      throw new CategoryPositionAlreadyExistsError();
    }
    if (duplicatedFields.some((field) => field.includes("name"))) {
      throw new CategoryNameAlreadyExistsError();
    }
  }

  throw error;
}

interface LockedMethodologyVersionRow {
  status: MethodologyVersionStatus;
}

/**
 * Locks a methodology version row: the parent every category position hangs off.
 *
 * Same shape and the same reason as `lockCategory` one level down (see the
 * subcategories helpers). Category positions are unique per methodology version
 * among non-DELETED rows, and every writer of a position — a create with its
 * appended MAX + 1, a reorder with its temporary MAX + 1, the repack a delete
 * leaves behind — is checked against that one partial unique index, so they
 * have to queue on the parent instead of all reading the same MAX.
 *
 * The status comes off the locked row, not from a read before it: a methodology
 * version read as live and only then locked can have been soft-deleted in
 * between, which would leave an ACTIVE category hanging off a DELETED parent.
 *
 * The lock is only held to the end of the enclosing transaction, so the
 * parameter is the transaction client.
 *
 * Returns null when no such methodology version row exists.
 */
export async function lockMethodologyVersion(
  tx: Prisma.TransactionClient,
  methodologyVersionId: bigint
): Promise<MethodologyVersionStatus | null> {
  const rows = await tx.$queryRaw<LockedMethodologyVersionRow[]>`
    SELECT "status"
    FROM "methodology_version"
    WHERE "id" = ${methodologyVersionId}
    FOR UPDATE
  `;

  return rows[0]?.status ?? null;
}

/**
 * Next position inside a methodology version: a category is always appended
 * last.
 *
 * The mirror of `getNextSubcategoryPosition` one level down, and for the same
 * reason: positions are not supplied by the client. DELETED rows are excluded
 * from both the max and the partial unique index, so the position of a
 * soft-deleted category becomes free again — and `deleteCategory` repacks the
 * categories that follow the deleted row, so the live sequence stays contiguous
 * and MAX + 1 is the slot right after the last row.
 *
 * Callers must already hold the methodology version lock (see
 * `lockMethodologyVersion`), which is why the parameter is the transaction
 * client. Without it two concurrent creates in the same methodology version
 * both read the same max under READ COMMITTED, both attempt the same position,
 * and the partial unique index rejects the loser with a 409 about a field the
 * client never filled in.
 */
export async function getNextCategoryPosition(
  tx: Prisma.TransactionClient,
  methodologyVersionId: bigint
): Promise<number> {
  const { _max } = await tx.category.aggregate({
    where: {
      methodologyVersionId,
      status: { not: CategoryStatus.DELETED },
    },
    _max: { position: true },
  });

  return (_max.position ?? 0) + 1;
}

/**
 * Closes the hole a category left behind in its methodology version.
 *
 * The mirror of `repackSubcategoryPositions` one level down, down to the
 * reasons: the live sequence has to stay contiguous because positions are
 * user-visible (the "Pos." column, the Excel export, the docs' 1..N tables) and
 * the seed rejects authored gaps.
 *
 * Siblings are fetched sorted by position ASC so each one moves into a slot the
 * previous update already freed: PostgreSQL checks the partial unique index
 * after each row, not after the full statement, so a bulk `updateMany` would
 * violate it.
 *
 * The status predicate is the index's own — every row that is not DELETED — and
 * the same one `getNextCategoryPosition` counts. A row this call refused to
 * shift while MAX + 1 counted it would leave a hole the next append lands in.
 *
 * Only `position` is written. Shifting a sibling is bookkeeping, not an edit, so
 * stamping the actor here would report every following category as "modified
 * just now" by whoever deleted one of their siblings, erasing who last edited
 * each one.
 *
 * Callers must already hold the methodology version lock (see
 * `lockMethodologyVersion`), which is why the parameter is the transaction
 * client: without it a concurrent create reads the pre-repack MAX and reopens
 * the gap this call just closed, and a concurrent reorder moves a row this call
 * has already decided to shift.
 */
export async function repackCategoryPositions(
  tx: Prisma.TransactionClient,
  methodologyVersionId: bigint,
  freedPosition: number
): Promise<void> {
  const toShift = await tx.category.findMany({
    where: {
      methodologyVersionId,
      status: { not: CategoryStatus.DELETED },
      position: { gt: freedPosition },
    },
    select: { id: true },
    orderBy: { position: "asc" },
  });

  for (const sibling of toShift) {
    await tx.category.update({
      where: { id: sibling.id },
      data: { position: { decrement: 1 } },
    });
  }
}

interface LockedCategoryRow {
  id: bigint;
  methodology_version_id: bigint;
  status: CategoryStatus;
  position: number;
}

export interface LockedCategory {
  id: bigint;
  methodologyVersionId: bigint;
  status: CategoryStatus;
  position: number;
}

/**
 * Locks category rows and returns what a reorder needs to validate.
 *
 * The methodology version lock is not enough on its own: the positions to swap
 * come from an unlocked read, so a concurrent reorder can have changed them and
 * a concurrent delete can have soft-deleted either row between that read and
 * the writes. Locking the rows themselves and re-reading them closes that
 * window — a concurrent write either commits before the lock is granted and is
 * seen by the caller, or waits until this transaction ends.
 *
 * Rows are locked in id order so two callers asking for the same pair cannot
 * deadlock against each other, and only existing rows come back — a caller that
 * asked for an id it does not find here has to treat it as missing.
 */
export async function lockCategories(
  tx: Prisma.TransactionClient,
  ids: bigint[]
): Promise<LockedCategory[]> {
  const rows = await tx.$queryRaw<LockedCategoryRow[]>`
    SELECT "id", "methodology_version_id", "status", "position"
    FROM "category"
    WHERE "id" IN (${Prisma.join(ids)})
    ORDER BY "id"
    FOR UPDATE
  `;

  return rows.map((row) => ({
    id: row.id,
    methodologyVersionId: row.methodology_version_id,
    status: row.status,
    position: row.position,
  }));
}
