import createError from "@fastify/error";
import { Prisma } from "@repo/database";

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

const normalizeP2002FieldName = (value: string): string =>
  value
    .trim()
    .replace(/^[`"'[]+/, "")
    .replace(/[`"'\]]+$/, "")
    .replace(/^[^a-zA-Z0-9_]+|[^a-zA-Z0-9_]+$/g, "");

const extractP2002Fields = (value: string | string[] | undefined): string[] => {
  if (!value) {
    return [];
  }

  const rawItems = Array.isArray(value)
    ? value
    : value
        .split(/[(),]/)
        .map((item) => item.trim())
        .filter(Boolean);

  return rawItems
    .map((item) => {
      const normalized = normalizeP2002FieldName(item);
      const dotIndex = normalized.lastIndexOf(".");
      return dotIndex >= 0 ? normalized.slice(dotIndex + 1) : normalized;
    })
    .filter(Boolean);
};

export const getDuplicatedFieldsFromP2002Error = (
  error: Prisma.PrismaClientKnownRequestError
): string[] => {
  if (error.code !== "P2002") {
    return [];
  }

  const rawTarget = error.meta?.target as string | string[] | undefined;
  const constraintFields = extractP2002Fields(rawTarget);

  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
  const rawDriverFields = (error.meta?.driverAdapterError as any)?.cause
    ?.constraint?.fields as string | string[] | undefined;
  const driverAdapterFields = extractP2002Fields(rawDriverFields);

  const allFields = [
    ...(constraintFields || []),
    ...(driverAdapterFields || []),
  ];
  return [...new Set(allFields)];
};
