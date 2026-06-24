import createError from "@fastify/error";

/**
 * Thrown when re-parenting a catalog row (changing its parent FK) is rejected because the
 * row still has dependents that would be silently moved to a different parent — e.g.
 * changing a subsector's `countrySectorId` while ACTIVE main activities, subcategory
 * recommendations or organization profiles still point at it. Re-association is only
 * allowed by soft-deleting (which cascades) and re-creating under the correct parent, so
 * the denormalized parent columns the delete-cascade relies on never drift. HTTP 409
 * because this is a business-rule validation surface. Callers should attach `details`
 * (resourceType, referencedBy) via `attachDetails` so the frontend can render localized copy.
 */
export const ReparentBlockedByReferencesError = createError(
  "REPARENT_BLOCKED_BY_REFERENCES",
  "Cannot re-parent: still referenced by %s",
  409
);
