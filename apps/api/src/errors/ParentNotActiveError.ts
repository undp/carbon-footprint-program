import createError from "@fastify/error";

/**
 * Thrown when a soft-deleted row cannot be restored because its parent in the catalog
 * hierarchy is itself soft-deleted (e.g., restoring a subsector while its parent rubro
 * is DELETED). HTTP 409 because this is a business-rule validation surface, not a
 * server failure. Callers must overwrite `error.message` with a Spanish, end-user-friendly
 * sentence that names the parent (e.g., `No se puede restaurar el subrubro porque el rubro
 * "Foo" está eliminado. Restáuralo primero.`) so the frontend's restore-blocked dialog
 * can show it directly.
 */
export const ParentNotActiveError = createError(
  "PARENT_NOT_ACTIVE",
  "Cannot restore: parent %s is not active",
  409
);
