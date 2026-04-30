import createError from "@fastify/error";

/**
 * Thrown when a soft-delete is rejected because the target row is still referenced by
 * one or more ACTIVE catalog records (e.g., soft-deleting a sector while ACTIVE subsectors
 * point at it). HTTP 409 because this is a business-rule validation surface. Callers
 * should attach `details` (resourceType, referencedBy) via `attachDetails` so the
 * frontend can render localized copy.
 */
export const DeleteBlockedByReferencesError = createError(
  "DELETE_BLOCKED_BY_REFERENCES",
  "Cannot delete: still referenced by %s",
  409
);
