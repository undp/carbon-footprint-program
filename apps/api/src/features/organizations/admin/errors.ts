import createError from "@fastify/error";

export const OrganizationAlreadyBlockedError = createError(
  "ORGANIZATION_ALREADY_BLOCKED",
  "Organization with ID %s is already blocked",
  409
);

export const OrganizationAlreadyUnblockedError = createError(
  "ORGANIZATION_ALREADY_UNBLOCKED",
  "Organization with ID %s is already unblocked",
  409
);
