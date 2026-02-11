import createError from "@fastify/error";

export const OrganizationNotFoundError = createError(
  "ORGANIZATION_NOT_FOUND",
  "Organization with ID %s not found",
  404
);

export const OrganizationAccessDeniedError = createError(
  "ORGANIZATION_ACCESS_DENIED",
  "User does not have access to organization with ID %s",
  403
);

export const OrganizationDataNotFoundError = createError(
  "ORGANIZATION_DATA_NOT_FOUND",
  "No data found for organization with ID %s",
  404
);

export const SubmissionAlreadyExistsError = createError(
  "SUBMISSION_ALREADY_EXISTS",
  "An active submission already exists for organization data with ID %s",
  409
);

export const CountryOrganizationSizeNotFoundError = createError(
  "COUNTRY_ORGANIZATION_SIZE_NOT_FOUND",
  "Organization size with ID %s not found or does not belong to the country",
  404
);

export const CountrySectorNotFoundError = createError(
  "COUNTRY_SECTOR_NOT_FOUND",
  "Sector with ID %s not found or does not belong to the country",
  404
);

export const CountrySubsectorNotFoundError = createError(
  "COUNTRY_SUBSECTOR_NOT_FOUND",
  "Subsector with ID %s not found, does not belong to the country, or does not belong to the specified sector",
  404
);

export const CountryJobPositionNotFoundError = createError(
  "COUNTRY_JOB_POSITION_NOT_FOUND",
  "Job position with ID %s not found or does not belong to the country",
  404
);

export const InvalidOrganizationStateError = createError(
  "INVALID_ORGANIZATION_STATE",
  "Organization with ID %s is in an invalid state for this operation: %s",
  400
);
