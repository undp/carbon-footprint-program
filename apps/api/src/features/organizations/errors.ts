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
