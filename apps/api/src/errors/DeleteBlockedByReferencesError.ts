import createError from "@fastify/error";

/**
 * Thrown when a soft-delete is rejected because the target row is still referenced by
 * one or more ACTIVE catalog records (e.g., soft-deleting a sector while ACTIVE subsectors
 * point at it). HTTP 409 because this is a business-rule validation surface, not a server
 * failure. The message accepts a single placeholder describing the blocking reference
 * type(s); callers should also attach a Spanish `userMessage` on the thrown error so the
 * frontend can render a localized snackbar via getApiErrorMessage.
 */
export const DeleteBlockedByReferencesError = createError(
  "DELETE_BLOCKED_BY_REFERENCES",
  "Cannot delete: still referenced by %s",
  409
);
