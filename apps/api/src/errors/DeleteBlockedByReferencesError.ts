import createError from "@fastify/error";

/**
 * Thrown when a soft-delete is rejected because the target row is still referenced by
 * one or more ACTIVE catalog records (e.g., soft-deleting a sector while ACTIVE subsectors
 * point at it). HTTP 409 because this is a business-rule validation surface, not a server
 * failure. Callers should overwrite `error.message` with a Spanish, end-user-friendly
 * sentence (e.g., "No se puede eliminar el rubro porque tiene subrubros activos
 * asociados.") so the frontend's `getApiErrorMessage` can surface it directly.
 */
export const DeleteBlockedByReferencesError = createError(
  "DELETE_BLOCKED_BY_REFERENCES",
  "Cannot delete: still referenced by %s",
  409
);
