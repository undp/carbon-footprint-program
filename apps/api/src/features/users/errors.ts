import createError from "@fastify/error";

export const EmailAlreadyInUseError = createError(
  "EMAIL_ALREADY_IN_USE",
  "Email already in use",
  409
);

export const IdpUserIdAlreadyInUseError = createError(
  "IDP_USER_ID_ALREADY_IN_USE",
  "Idp user ID already in use",
  409
);

export const UserNotFoundError = createError(
  "USER_NOT_FOUND",
  "User with ID %s not found",
  404
);

export const InvalidCountryJobPositionIdError = createError(
  "INVALID_COUNTRY_JOB_POSITION_ID",
  "Invalid countryJobPositionId: the provided reference does not exist",
  400
);

export const SelfRoleChangeError = createError(
  "SELF_ROLE_CHANGE",
  "You cannot change your own role",
  403
);

export const LastSuperadminError = createError(
  "LAST_SUPERADMIN",
  "Cannot demote the last superadmin",
  409
);

export const InvalidRoleTransitionError = createError(
  "INVALID_ROLE_TRANSITION",
  "The requested role transition is not allowed",
  409
);
