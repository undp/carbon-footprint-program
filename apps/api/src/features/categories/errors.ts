import createError from "@fastify/error";
import { Prisma } from "@repo/database";

export const CategoryNotFoundError = createError(
  "CATEGORY_NOT_FOUND",
  "Category not found",
  404
);

export const CategoryIsDeletedError = createError(
  "CATEGORY_IS_DELETED",
  "Category is deleted",
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

export const MethodologyVersionNotFoundForCategoryError = createError(
  "METHODOLOGY_VERSION_NOT_FOUND_FOR_CATEGORY",
  "Methodology version not found",
  404
);

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

  const constraintFields = error.meta?.target as string[] | undefined;

  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
  const driverAdapterFields = (error.meta?.driverAdapterError as any)?.cause
    ?.constraint?.fields as string[] | undefined;

  const allFields = [
    ...(constraintFields || []),
    ...(driverAdapterFields || []),
  ];
  return [...new Set(allFields)];
};
