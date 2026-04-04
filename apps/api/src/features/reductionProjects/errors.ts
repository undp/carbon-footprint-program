import createError from "@fastify/error";

export const ReductionProjectNotFoundError = createError(
  "REDUCTION_PROJECT_NOT_FOUND",
  "Reduction project with ID %s not found",
  404
);

export const ReductionProjectNotDeletableError = createError(
  "REDUCTION_PROJECT_NOT_DELETABLE",
  "Reduction project %s cannot be deleted in its current status (%s)",
  403
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

export const ReductionProjectOrganizationNotAssociatedError = createError(
  "REDUCTION_PROJECT_ORGANIZATION_NOT_ASSOCIATED",
  "Reduction project with ID %s does not have an associated organization",
  422
);

export const ReductionProjectOrganizationNotAccreditedError = createError(
  "REDUCTION_PROJECT_ORGANIZATION_NOT_ACCREDITED",
  "The organization associated with reduction project %s is not accredited",
  422
);
