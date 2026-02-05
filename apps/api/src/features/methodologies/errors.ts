import createError from "@fastify/error";
import { Prisma } from "@repo/database";

export const MethodologyNameAlreadyExistsError = createError(
  "METHODOLOGY_NAME_ALREADY_EXISTS",
  "A methodology with this name already exists for this country",
  409
);

export const NoCountryFoundError = createError(
  "NO_COUNTRY_FOUND",
  "No country exists in the database",
  500
);

export const MethodologyNotFoundError = createError(
  "METHODOLOGY_NOT_FOUND",
  "Methodology not found",
  404
);

export const MethodologyHasActiveInventoriesError = createError(
  "METHODOLOGY_HAS_ACTIVE_INVENTORIES",
  "Cannot delete methodology: it has active carbon inventories",
  409
);

/**
 * Extracts the duplicated field names from a Prisma P2002 (unique constraint violation) error.
 * Handles both standard Prisma error format and driver adapter error format.
 *
 * @param error - The Prisma error with code P2002
 * @returns An array of field names that caused the unique constraint violation
 */
export const getDuplicatedFieldsFromP2002Error = (
  error: Prisma.PrismaClientKnownRequestError
): string[] => {
  if (error.code !== "P2002") {
    return [];
  }

  // Check standard Prisma error format (uses Prisma field names)
  const constraintFields = error.meta?.target as string[] | undefined;

  // Check driver adapter error format (uses database column names)
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
  const driverAdapterFields = (error.meta?.driverAdapterError as any)?.cause?.constraint
    ?.fields as string[] | undefined;

  // Combine both sources and remove duplicates
  const allFields = [...(constraintFields || []), ...(driverAdapterFields || [])];
  return [...new Set(allFields)];
};
