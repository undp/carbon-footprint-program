import createError from "@fastify/error";

export const ReductionProjectNotFoundError = createError(
  "REDUCTION_PROJECT_NOT_FOUND",
  "Reduction project with ID %s not found",
  404
);

export const InvalidStatusTransitionError = createError(
  "INVALID_STATUS_TRANSITION",
  "Cannot transition reduction project %s from %s to %s",
  422
);

export const IncompleteProjectError = createError(
  "INCOMPLETE_PROJECT",
  "Reduction project %s is missing required fields for submission: %s",
  422
);

export const NegativeReductionValueError = createError(
  "NEGATIVE_REDUCTION_VALUE",
  "Reduction project %s: baselineValue must be greater than or equal to projectValue",
  400
);

export const FileTypeLimitExceededError = createError(
  "FILE_TYPE_LIMIT_EXCEEDED",
  "A file of type %s already exists in reduction project %s",
  400
);

export const MissingRequiredDocumentsError = createError(
  "MISSING_REQUIRED_DOCUMENTS",
  "Reduction project %s is missing required documents: %s",
  422
);
