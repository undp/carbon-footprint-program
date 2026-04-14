import createError from "@fastify/error";

export const ReductionProjectNotFoundError = createError(
  "REDUCTION_PROJECT_NOT_FOUND",
  "Reduction project with ID %s not found",
  404
);

export const ReductionProjectCannotRequestVerificationError = createError(
  "REDUCTION_PROJECT_CANNOT_REQUEST_VERIFICATION",
  "Reduction project %s cannot request verification in its current state",
  422
);

export const ReductionProjectInvalidDataError = createError(
  "REDUCTION_PROJECT_INVALID_DATA",
  "The provided organization or carbon inventory data is invalid or inaccessible",
  422
);

export const ReductionProjectFileAttachmentsRequiredError = createError(
  "REDUCTION_PROJECT_FILE_ATTACHMENTS_REQUIRED",
  "File attachments are required to submit a reduction project",
  400
);

export const ReductionProjectNotUpdatableError = createError(
  "REDUCTION_PROJECT_NOT_UPDATABLE",
  "Reduction project %s is not updatable in its current state (%s)",
  422
);
