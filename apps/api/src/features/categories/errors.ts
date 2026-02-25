import createError from "@fastify/error";
import { Prisma } from "@repo/database";

export const CategoryNotFoundError = createError(
  "CATEGORY_NOT_FOUND",
  "Category not found (ID: %s)",
  404
);

export const CategoryNameAlreadyExistsError = createError(
  "CATEGORY_NAME_ALREADY_EXISTS",
  "A category with this name already exists for this methodology version",
  409
);

export const CategoryPositionAlreadyExistsError = createError(
  "CATEGORY_POSITION_ALREADY_EXISTS",
  "A category with this position already exists for this methodology version",
  409
);

export const SameCategoryError = createError(
  "SAME_CATEGORY",
  "Both category IDs must be different",
  422
);

export const CategoriesFromDifferentMethodologyVersionsError = createError(
  "CATEGORIES_FROM_DIFFERENT_METHODOLOGY_VERSIONS",
  "Both categories must belong to the same methodology version (Category IDs: %s, %s)",
  422
);

export const MethodologyVersionNotFoundForCategoryError = createError(
  "METHODOLOGY_VERSION_NOT_FOUND_FOR_CATEGORY",
  "Methodology version not found",
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

/**
 * Extracts the duplicated field names from a Prisma P2002 (unique constraint violation) error.
 * Handles both standard Prisma error format and driver adapter error format.
 */
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
