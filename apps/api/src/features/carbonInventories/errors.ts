import createError from "@fastify/error";

export const CarbonInventoryNotFoundError = createError(
  "CARBON_INVENTORY_NOT_FOUND",
  "Carbon inventory with ID %s not found",
  404
);

export const CarbonInventoryNotDeletableError = createError(
  "CARBON_INVENTORY_NOT_DELETABLE",
  "Carbon inventory %s cannot be deleted in its current status (%s)",
  403
);

export const MethodologyNotFoundError = createError(
  "METHODOLOGY_NOT_FOUND",
  "Methodology not found for carbon inventory with ID %s",
  404
);

export const SubcategoryNotFoundError = createError(
  "SUBCATEGORY_NOT_FOUND",
  "One or more subcategories not found",
  404
);

export const SubcategoryNotInMethodologyError = createError(
  "SUBCATEGORY_NOT_IN_METHODOLOGY",
  "One or more subcategories do not belong to the carbon inventory's methodology",
  422
);

export const NoActiveMethodologyError = createError(
  "NO_ACTIVE_METHODOLOGY",
  "No active methodology version found",
  422
);

export const LineNotFoundError = createError(
  "LINE_NOT_FOUND",
  "Line with ID %s not found",
  404
);

export const LineNotInCarbonInventoryError = createError(
  "LINE_NOT_IN_CARBON_INVENTORY",
  "Line %s does not belong to carbon inventory %s (found in inventory %s)",
  422
);

export const OrganizationNotAssociatedError = createError(
  "ORGANIZATION_NOT_ASSOCIATED",
  "Carbon inventory with ID %s does not have an associated organization",
  422
);

export const OrganizationNotAccreditedError = createError(
  "ORGANIZATION_NOT_ACCREDITED",
  "The organization associated with carbon inventory %s is not accredited",
  422
);

export const CarbonInventoryCannotRequestCalculationError = createError(
  "CARBON_INVENTORY_CANNOT_REQUEST_CALCULATION",
  "Carbon inventory %s cannot request calculation: must be in DRAFT status or have a REVIEWED CALCULATION submission",
  422
);

export const CarbonInventoryNotEditableError = createError(
  "CARBON_INVENTORY_NOT_EDITABLE",
  "Carbon inventory %s is not editable in its current status (%s)",
  403
);

export const CarbonInventoryCannotRequestVerificationError = createError(
  "CARBON_INVENTORY_CANNOT_REQUEST_VERIFICATION",
  "Carbon inventory %s cannot request verification: must have an APPROVED CALCULATION submission or a REVIEWED VERIFICATION submission",
  422
);

export const CarbonInventoryInvalidUuidError = createError(
  "CARBON_INVENTORY_INVALID_UUID",
  "Invalid UUID for carbon inventory %s",
  400
);

export const CrossInventoryFileLinkingError = createError(
  "CROSS_INVENTORY_FILE_LINKING",
  "One or more files do not belong to carbon inventory %s: %s",
  422
);
