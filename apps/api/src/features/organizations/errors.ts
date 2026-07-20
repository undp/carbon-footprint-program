import createError from "@fastify/error";

export const OrganizationNotFoundError = createError(
  "ORGANIZATION_NOT_FOUND",
  "Organization with ID %s not found",
  404
);

export const OrganizationAccessDeniedError = createError(
  "ORGANIZATION_ACCESS_DENIED",
  "You do not have permission to access organization with ID %s",
  403
);

export const SubmissionAlreadyExistsError = createError(
  "SUBMISSION_ALREADY_EXISTS",
  "Organization with ID %s already has a pending submission",
  409
);

export const OrganizationUnderReviewError = createError(
  "ORGANIZATION_UNDER_REVIEW",
  "Unable to edit organization during review. Please wait for the submission to be approved or rejected.",
  409
);

export const OrganizationDataNotFoundError = createError(
  "ORGANIZATION_DATA_NOT_FOUND",
  "Organization data with ID %s not found",
  404
);

export const OrganizationDataAlreadyRejectedError = createError(
  "ORGANIZATION_DATA_ALREADY_REJECTED",
  "Organization data with ID %s is already rejected",
  409
);

export const FileAttachmentsNotSupportedError = createError(
  "FILE_ATTACHMENTS_NOT_SUPPORTED",
  "File attachments cannot be included when updating organization data in %s state. File attachments are only supported when creating a new submission for review.",
  400
);

export const FileAttachmentsRequiredError = createError(
  "FILE_ATTACHMENTS_REQUIRED",
  "File attachments are required when updating an accredited organization or requesting accreditation for a new organization.",
  400
);

export const OrganizationAlreadyAccreditedError = createError(
  "ORGANIZATION_ALREADY_ACCREDITED",
  "Organization with ID %s is already accredited",
  409
);

export const LegalNameAlreadyAccreditedError = createError(
  "LEGAL_NAME_ALREADY_ACCREDITED",
  "Another organization is already accredited with legal name %s",
  409
);

export const OrganizationAccreditationDataMissingError = createError(
  "ORGANIZATION_ACCREDITATION_DATA_MISSING",
  "Organization accreditation submission %s has no linked organization data",
  409
);
