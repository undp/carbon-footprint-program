import { Prisma } from "@repo/database";
import { EmissionFactorYearCopyConflictError } from "../errors.js";

/**
 * Turns a write failure of the year copy into the error it answers with.
 *
 * P2002 means a concurrent write created a factor with the same unique index
 * key between the copy's reads and its insert. The transaction rolled back, so
 * nothing was written and a retry recomputes the plan: a 409 the page explains
 * as "retry", not the generic `DATABASE_UNIQUE_CONSTRAINT`. Any other error is
 * returned as it is, for the global handler.
 */
export function toYearCopyWriteError(error: unknown): unknown {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  ) {
    return new EmissionFactorYearCopyConflictError();
  }
  return error;
}
