import createError from "@fastify/error";

export const EmissionFactorDimensionNotFoundError = createError(
  "EMISSION_FACTOR_DIMENSION_NOT_FOUND",
  "Emission factor dimension not found",
  404
);

export const DimensionDeletionNotAllowedError = createError(
  "DIMENSION_DELETION_NOT_ALLOWED",
  "Solo se puede eliminar la posición 1 cuando es la única dimensión activa de la subcategoría",
  409
);

export const MaxDimensionsPerSubcategoryError = createError(
  "MAX_DIMENSIONS_PER_SUBCATEGORY",
  "La subcategoría ya tiene 2 dimensiones",
  422
);

export const DimensionPositionAlreadyTakenError = createError(
  "DIMENSION_POSITION_ALREADY_TAKEN",
  "La posición %s ya está ocupada para esta subcategoría",
  409
);

export const DimensionMustHaveAtLeastOneValueError = createError(
  "DIMENSION_MUST_HAVE_AT_LEAST_ONE_VALUE",
  "La dimensión debe tener al menos una variable",
  400
);

export const DuplicateDimensionValueError = createError(
  "DUPLICATE_DIMENSION_VALUE",
  "Ya existe una variable con el nombre '%s' en esta dimensión",
  409
);

export const SubcategoryNotFoundForDimensionError = createError(
  "SUBCATEGORY_NOT_FOUND_FOR_DIMENSION",
  "Subcategory not found",
  404
);

export const DimensionValueNotFoundForRemovalError = createError(
  "DIMENSION_VALUE_NOT_FOUND_FOR_REMOVAL",
  "Dimension value not found (ID: %s)",
  404
);

export const DimensionValuesCannotBeRemovedError = createError(
  "DIMENSION_VALUES_CANNOT_BE_REMOVED",
  "No se pueden eliminar variables de una dimensión que tiene factores de emisión activos",
  409
);

export const DimensionIsRequiredChangeBlockedError = createError(
  "DIMENSION_IS_REQUIRED_CHANGE_BLOCKED",
  "No se puede cambiar el campo 'requerido' porque existen factores de emisión activos para esta subcategoría",
  409
);

export const DimensionValueNotFoundForRenameError = createError(
  "DIMENSION_VALUE_NOT_FOUND_FOR_RENAME",
  "Dimension value not found for rename (ID: %s)",
  404
);
