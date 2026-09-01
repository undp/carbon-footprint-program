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

export const FileAlreadyLinkedError = createError(
  "FILE_ALREADY_LINKED",
  "One or more files are already linked to a different line: %s",
  422
);

export const CarbonInventoryAlreadyHasOrganizationError = createError(
  "CARBON_INVENTORY_ALREADY_HAS_ORGANIZATION",
  "Carbon inventory %s already has an associated organization",
  422
);

export const CatalogEmissionFactorNotFoundError = createError(
  "CATALOG_EMISSION_FACTOR_NOT_FOUND",
  "The selected emission factor does not exist or is no longer active (ID: %s)",
  404
);

export const CatalogEmissionFactorNotInMethodologyError = createError(
  "CATALOG_EMISSION_FACTOR_NOT_IN_METHODOLOGY",
  "The selected emission factor does not belong to this inventory's methodology or to the line's subcategory (ID: %s)",
  422
);

export const CatalogEmissionFactorDimensionMismatchError = createError(
  "CATALOG_EMISSION_FACTOR_DIMENSION_MISMATCH",
  "The selected emission factor does not match the line's required dimension values (ID: %s)",
  422
);

export const CatalogEmissionFactorUnitFamilyMismatchError = createError(
  "CATALOG_EMISSION_FACTOR_UNIT_FAMILY_MISMATCH",
  "The requested applied rate unit is not convertible from the selected emission factor's unit family (factor ID: %s)",
  422
);
