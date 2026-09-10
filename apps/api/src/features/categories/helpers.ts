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
 * A position collision reaches a client only from `createCategory`, which takes
 * `position` from the request. The reorder writes MAX + 1 under the methodology
 * version lock, so there it means a position was written outside that path.
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
 * among non-DELETED rows, and both writers of a position — a create with its
 * client-supplied one, a reorder with its temporary MAX + 1 — are checked
 * against that one partial unique index, so they have to queue on the parent
 * instead of both reading the same MAX.
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
