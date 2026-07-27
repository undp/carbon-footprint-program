import {
  GetSubmissionWarningsResponse,
  OrganizationIdentityCollisionMetadata,
  OrganizationIdentityCollisionMetadataSchema,
  WarningType,
} from "@repo/types";

export type CollisionWarning = {
  message: string;
  metadata: OrganizationIdentityCollisionMetadata;
};

/**
 * Render-boundary guard for the generic warning bag (design D2). The endpoint
 * returns `{ type, message, metadata }` with free-form `metadata`; here we
 * recover type-safety for the one warning kind the UI understands and drop
 * anything malformed or unrecognized (`safeParse`) so the section degrades
 * gracefully instead of crashing. Ordering (APPROVED before PENDING) is set by
 * the API and preserved here.
 */
export const parseCollisionWarnings = (
  warnings: GetSubmissionWarningsResponse | undefined
): CollisionWarning[] => {
  if (!warnings) return [];

  return warnings.flatMap((warning) => {
    if (warning.type !== WarningType.ORGANIZATION_IDENTITY_COLLISION) return [];

    const parsed = OrganizationIdentityCollisionMetadataSchema.safeParse(
      warning.metadata
    );

    return parsed.success
      ? [{ message: warning.message, metadata: parsed.data }]
      : [];
  });
};
