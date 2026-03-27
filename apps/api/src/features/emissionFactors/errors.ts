import createError from "@fastify/error";

export const EmissionFactorNotFoundError = createError(
  "EMISSION_FACTOR_NOT_FOUND",
  "Emission factor not found (ID: %s)",
  404
);

export const EmissionFactorDuplicateError = createError(
  "EMISSION_FACTOR_DUPLICATE",
  "An active emission factor with this source already exists for this subcategory",
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

export const EmissionFactorSourceConflictError = createError(
  "EMISSION_FACTOR_SOURCE_CONFLICT",
  "All active emission factors for this subcategory must share the same source. Existing source: %s",
  409
);

export const EmissionFactorGasDetailsMismatchError = createError(
  "EMISSION_FACTOR_GAS_DETAILS_MISMATCH",
  "The sum of gasDetails (%s) does not match the declared value (%s)",
  400
);

export const DimensionNotConfiguredError = createError(
  "DIMENSION_NOT_CONFIGURED",
  "No hay dimensión configurada en la posición %s para esta subcategoría",
  400
);

export const DimensionValueNotFoundError = createError(
  "DIMENSION_VALUE_NOT_FOUND",
  "El valor '%s' no existe en la dimensión de posición %s",
  404
);

export const SubcategoryChangeMissingDimensionsError = createError(
  "SUBCATEGORY_CHANGE_MISSING_DIMENSIONS",
  "When changing subcategoryId, dimensionValue1Name and dimensionValue2Name must be explicitly provided",
  400
);
