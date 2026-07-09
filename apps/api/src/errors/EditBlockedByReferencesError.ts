import createError from "@fastify/error";

/**
 * Thrown when an identity-changing edit to a profiling catalog row (its name or its parent
 * FK) is rejected because the row is already referenced elsewhere, and applying the edit
 * would silently corrupt those references:
 *
 *  - Re-parenting (changing the parent FK) would move dependents — and the denormalized
 *    parent columns the delete-cascade relies on — to a different parent. Blocked while the
 *    row has ANY dependent: catalog children (active main activities / subcategory
 *    recommendations), live `organization_data` rows, or an ACTIVE
 *    `carbon_inventory.organizationData` JSON snapshot.
 *  - Renaming a row already selected by a user would make that user see a name they never
 *    chose, because both the live `organization_data` rows and the frozen carbon-inventory
 *    snapshot resolve the display name by id at read time. Blocked while user data references
 *    it (live `organization_data` or an ACTIVE snapshot); catalog children alone do NOT block
 *    a rename.
 *
 * In both cases re-association is only allowed by soft-deleting (which cascades) and
 * re-creating under the correct identity, so the existing references keep resolving to the
 * value the user originally picked. HTTP 409 because this is a business-rule validation
 * surface. Callers should attach `details` (resourceType, attemptedChange, referencedBy) via
 * `attachDetails` so the frontend can render localized copy.
 */
export const EditBlockedByReferencesError = createError(
  "EDIT_BLOCKED_BY_REFERENCES",
  "Cannot edit: still referenced by %s",
  409
);
