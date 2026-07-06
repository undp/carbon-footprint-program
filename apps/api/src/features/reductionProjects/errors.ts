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

export const ReductionProjectNotUpdatableError = createError(
  "REDUCTION_PROJECT_NOT_UPDATABLE",
  "Reduction project %s is not updatable in its current state (%s)",
  422
);

export const ReductionProjectNotDeletableError = createError(
  "REDUCTION_PROJECT_NOT_DELETABLE",
  "Reduction project %s is not deletable",
  422
);

// Thrown when an edit re-parents a project to an organization the caller is not
// a CONTRIBUTOR/ADMIN member of. The route's `reductionProject` auth resolves
// the current (source) org from `:id`; this guards the destination org.
export const ReductionProjectOrganizationForbiddenError = createError(
  "REDUCTION_PROJECT_ORGANIZATION_FORBIDDEN",
  "You do not have access to organization %s",
  403
);
