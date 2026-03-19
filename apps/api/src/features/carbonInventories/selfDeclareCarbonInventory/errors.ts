import createError from "@fastify/error";

export const CarbonInventoryCannotSelfDeclareError = createError(
  "CARBON_INVENTORY_CANNOT_SELF_DECLARE",
  "Carbon inventory %s cannot be self-declared",
  422
);

export const CarbonInventoryNotFoundForSelfDeclareError = createError(
  "CARBON_INVENTORY_NOT_FOUND_FOR_SELF_DECLARE",
  "Carbon inventory %s not found",
  404
);

export const CarbonInventoryNotActiveForSelfDeclareError = createError(
  "CARBON_INVENTORY_NOT_ACTIVE_FOR_SELF_DECLARE",
  "Carbon inventory %s is not in ACTIVE status",
  422
);

export const CarbonInventoryAlreadySelfDeclaredError = createError(
  "CARBON_INVENTORY_ALREADY_SELF_DECLARED",
  "Carbon inventory %s is already self-declared",
  422
);

export const CarbonInventoryMissingOrganizationError = createError(
  "CARBON_INVENTORY_MISSING_ORGANIZATION",
  "Carbon inventory %s has no associated organization",
  422
);

export const CarbonInventoryMissingYearError = createError(
  "CARBON_INVENTORY_MISSING_YEAR",
  "Carbon inventory %s has no year set",
  422
);

export const CarbonInventoryNotDraftForSelfDeclareError = createError(
  "CARBON_INVENTORY_NOT_DRAFT_FOR_SELF_DECLARE",
  "Carbon inventory %s must be in DRAFT status to self-declare",
  422
);
