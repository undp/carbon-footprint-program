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
