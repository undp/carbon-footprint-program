import {
  GetSubmissionWarningsResponse,
  OrganizationIdentityCollisionMetadata,
  OrganizationIdentityCollisionMetadataSchema,
  WarningType,
} from "@repo/types";

/**
 * Render-boundary guard for the generic warning bag (design D2). The endpoint
 * returns `{ type, metadata }` with free-form `metadata`; here we recover
 * type-safety for the one warning kind the UI understands and drop anything
 * malformed or unrecognized (`safeParse`) so the section degrades gracefully
 * instead of crashing. `type` is typed as the current registry, but a newer API
 * can still send a kind this build does not know, so the check stays. Ordering
 * (APPROVED before PENDING) is set by the API and preserved here.
 */
export const parseCollisionWarnings = (
  warnings: GetSubmissionWarningsResponse | undefined
): OrganizationIdentityCollisionMetadata[] => {
  if (!warnings) return [];

  return warnings.flatMap((warning) => {
    if (warning.type !== WarningType.ORGANIZATION_IDENTITY_COLLISION) return [];

    const parsed = OrganizationIdentityCollisionMetadataSchema.safeParse(
      warning.metadata
    );

    return parsed.success ? [parsed.data] : [];
  });
};
