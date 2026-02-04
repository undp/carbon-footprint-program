import type { PrismaClient } from "@repo/database";

/**
 * Gets the first methodology version from the database
 * This is useful for tests that need an existing methodologyVersionId
 */
export async function getTestMethodologyVersionId(
  prisma: PrismaClient
): Promise<bigint> {
  // There is only one methodology version in the testing database, so we can just return the first one
  const methodologyVersion = await prisma.methodologyVersion.findFirst({
    select: { id: true },
  });

  if (!methodologyVersion) {
    throw new Error(
      "No methodology version found in database. " +
        "Please ensure the database is properly seeded with methodology versions before running tests."
    );
  }

  return methodologyVersion.id;
}

/**
 * Gets the first country from the database
 * This is useful for tests that need a countryId
 */
export async function getTestCountryId(prisma: PrismaClient): Promise<bigint> {
  const country = await prisma.country.findFirst({
    select: { id: true },
  });

  if (!country) {
    throw new Error(
      "No country found in database. Please ensure the database is properly seeded."
    );
  }

  return country.id;
}

/**
 * Creates a methodology version with no categories (and therefore no subcategories)
 * This is useful for testing edge cases where a methodology has no subcategories
 */
export async function createEmptyMethodologyVersion(
  prisma: PrismaClient,
  options?: {
    name?: string;
    description?: string;
  }
): Promise<{ id: bigint }> {
  const countryId = await getTestCountryId(prisma);

  // Generate a unique name to avoid unique constraint violations on (country_id, name)
  const baseName = options?.name ?? "Empty Methodology for Testing";
  const randomSuffix = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  const uniqueName = `${baseName} ${randomSuffix}`;

  return await prisma.methodologyVersion.create({
    data: {
      countryId,
      name: uniqueName,
      description:
        options?.description ??
        "A methodology with no subcategories for testing purposes",
    },
    select: { id: true },
  });
}
