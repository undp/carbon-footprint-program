/**
 * Attaches a `details` payload to an Error so the global error handler
 * (`apps/api/src/plugins/app/errorHandler.ts`) can include structured context
 * in the API response (e.g., the conflicting field on a unique-constraint
 * violation, or the parent resource type when a parent is not ACTIVE).
 *
 * Used together with custom errors from `apps/api/src/errors/` such as
 * `DatabaseUniqueConstraintViolationError`, `RestoreOnActiveError`, and
 * `ParentNotActiveError` to give the frontend (`getApiErrorMessage`) enough
 * information to render a precise, user-facing Spanish message without
 * having to inspect raw Prisma errors.
 */
export const attachDetails = <T extends Error>(
  error: T,
  details: Record<string, unknown>
): T => {
  (error as T & { details?: Record<string, unknown> }).details = details;
  return error;
};
