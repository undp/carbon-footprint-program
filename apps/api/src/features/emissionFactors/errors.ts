import createError from "@fastify/error";

export const EmissionFactorNotFoundError = createError(
  "EMISSION_FACTOR_NOT_FOUND",
  "Emission factor not found (ID: %s)",
  404
);

export const EmissionFactorDuplicateError = createError(
  "EMISSION_FACTOR_DUPLICATE",
  "An active emission factor already exists for this subcategory, required dimension values, year and source",
  409
);

export const EmissionFactorInUseError = createError(
  "EMISSION_FACTOR_IN_USE",
  "This emission factor is referenced by %s active line(s) of claimed footprints and cannot be modified or deleted",
  409
);

export const SubcategoryNotFoundForEmissionFactorError = createError(
  "SUBCATEGORY_NOT_FOUND_FOR_EMISSION_FACTOR",
  "Subcategory not found",
  404
);

export const RateMeasurementUnitNotFoundError = createError(
  "RATE_MEASUREMENT_UNIT_NOT_FOUND",
  "Rate measurement unit not found",
  404
);

export const EmissionFactorGasDetailsMismatchError = createError(
  "EMISSION_FACTOR_GAS_DETAILS_MISMATCH",
  "The sum of gasDetails (%s) does not match the declared value (%s)",
  400
);

export const DimensionNotConfiguredError = createError(
  "DIMENSION_NOT_CONFIGURED",
  "No dimension configured in position %s for this subcategory",
  400
);

export const DimensionValueNotFoundError = createError(
  "DIMENSION_VALUE_NOT_FOUND",
  "Value '%s' does not exist in dimension of position %s",
  404
);

export const SubcategoryChangeMissingDimensionsError = createError(
  "SUBCATEGORY_CHANGE_MISSING_DIMENSIONS",
  "When changing subcategoryId, dimensionValue1Name and dimensionValue2Name must be explicitly provided",
  400
);

/**
 * The year copy would break a factor rule. Every violation found is listed in
 * `details.violations` (attached with `attachDetails`), each with its reason
 * and source factor, so the copy page can mark the rows. Nothing is written.
 */
export const EmissionFactorYearCopyInvalidError = createError(
  "EMISSION_FACTOR_YEAR_COPY_INVALID",
  "The copy would break the emission factor rules; see details.violations",
  422
);

/**
 * A concurrent write created a factor with the same unique index key while the
 * copy ran. Nothing was written, and a retry recomputes the copy.
 */
export const EmissionFactorYearCopyConflictError = createError(
  "EMISSION_FACTOR_YEAR_COPY_CONFLICT",
  "Another write created a factor of the target year while copying; retry",
  409
);
