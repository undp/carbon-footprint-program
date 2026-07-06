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

// Login-time identity conflict: an authenticated principal presents a new IdP
// identity (idpUserId) whose email already belongs to a different user row.
// Identity is keyed on idpUserId and one email is NOT linked across multiple IdP
// identities (see GETTING_STARTED_REVIEW.md R8), so this is a hard 409 rather
// than silently forking the account or surfacing a misleading 404.
export const EmailRegisteredUnderDifferentIdentityError = createError(
  "EMAIL_REGISTERED_UNDER_DIFFERENT_IDENTITY",
  "Email already registered under a different identity",
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

export const InsufficientPermissionsError = createError(
  "INSUFFICIENT_PERMISSIONS",
  "You do not have permission to perform this action",
  403
);

export const InvalidRoleTransitionError = createError(
  "INVALID_ROLE_TRANSITION",
  "The requested role transition is not allowed",
  409
);
