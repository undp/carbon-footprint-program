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

export const ReductionProjectUnderReviewError = createError(
  "REDUCTION_PROJECT_UNDER_REVIEW",
  "Unable to edit reduction project while a verification submission is pending review.",
  409
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

export const ReductionProjectDraftNotUpdatableError = createError(
  "REDUCTION_PROJECT_DRAFT_NOT_UPDATABLE",
  "Reduction project %s is in DRAFT status and cannot be updated via this endpoint",
  422
);

export const ReductionProjectRejectedError = createError(
  "REDUCTION_PROJECT_REJECTED",
  "Reduction project %s has been rejected and cannot be updated",
  422
);

export const ReductionProjectNotEditableError = createError(
  "REDUCTION_PROJECT_NOT_EDITABLE",
  "Reduction project %s is not in an editable state",
  422
);
