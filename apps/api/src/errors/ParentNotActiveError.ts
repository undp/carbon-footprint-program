import createError from "@fastify/error";

/**
 * Thrown when a soft-deleted row cannot be restored because its parent in the catalog
 * hierarchy is itself soft-deleted (e.g., restoring a subsector while its parent rubro
 * is DELETED). HTTP 409 because this is a business-rule validation surface. Callers
 * should attach `details` (resourceType, resourceName, parentType, parentName) via
 * `attachDetails` so the frontend can render localized copy.
 */
export const ParentNotActiveError = createError(
  "PARENT_NOT_ACTIVE",
  "Cannot restore: parent %s is not active",
  409
);
