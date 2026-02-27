import createError from "@fastify/error";

export const UserNotFoundByEmailError = createError(
  "USER_NOT_FOUND_BY_EMAIL",
  "User with email %s not found",
  404
);

export const MembershipAlreadyExistsError = createError(
  "MEMBERSHIP_ALREADY_EXISTS",
  "User is already a member of this organization",
  409
);

export const MembershipNotFoundError = createError(
  "MEMBERSHIP_NOT_FOUND",
  "User is not a member of this organization",
  404
);

export const CannotModifySelfError = createError(
  "CANNOT_MODIFY_SELF",
  "Cannot modify your own organization membership",
  403
);

export const CannotRemoveLastAdminError = createError(
  "CANNOT_REMOVE_LAST_ADMIN",
  "Cannot remove the last admin from the organization",
  409
);
