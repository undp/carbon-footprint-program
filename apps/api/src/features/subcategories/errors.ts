import createError from "@fastify/error";
import { Prisma } from "@repo/database";

export const SubcategoryNotFoundError = createError(
  "SUBCATEGORY_NOT_FOUND",
  "Subcategory not found (ID: %s)",
  404
);

export const SubcategoryNameAlreadyExistsError = createError(
  "SUBCATEGORY_NAME_ALREADY_EXISTS",
  "A subcategory with this name already exists for this category",
  409
);

export const CategoryNotFoundForSubcategoryError = createError(
  "CATEGORY_NOT_FOUND_FOR_SUBCATEGORY",
  "Category not found",
  404
);

export const CategoryFromDifferentMethodologyError = createError(
  "CATEGORY_FROM_DIFFERENT_METHODOLOGY",
  "Target category must belong to the same methodology version",
  422
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
