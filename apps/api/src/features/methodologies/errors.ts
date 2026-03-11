import createError from "@fastify/error";

export const MethodologyNameVersionAlreadyExistsError = createError(
  "METHODOLOGY_NAME_VERSION_ALREADY_EXISTS",
  "A methodology with this name and version already exists for this country",
  409
);

export const NoCountryFoundError = createError(
  "NO_COUNTRY_FOUND",
  "No country exists in the database",
  500
);

export const MethodologyNotFoundError = createError(
  "METHODOLOGY_NOT_FOUND",
  "Methodology not found",
  404
);

export const MethodologyIsPublishedError = createError(
  "METHODOLOGY_IS_PUBLISHED",
  "Methodology is published",
  409
);

export const MethodologyHasActiveInventoriesError = createError(
  "METHODOLOGY_HAS_ACTIVE_INVENTORIES",
  "Cannot delete methodology: it has active carbon inventories",
  409
);

export const MethodologyIsDeletedError = createError(
  "METHODOLOGY_IS_DELETED",
  "Methodology is deleted",
  404
);
