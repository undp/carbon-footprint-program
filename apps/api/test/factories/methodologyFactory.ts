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
 * Gets an ENTITY status with the specified code from the database
 * This is useful for tests that need a statusId for methodology versions
 */
export async function getTestEntityStatusId(
  prisma: PrismaClient,
  code: string = "ACTIVE"
): Promise<bigint> {
  const status = await prisma.statusCatalog.findFirst({
    where: {
      scope: "ENTITY",
      code,
    },
    select: { id: true },
  });

  if (!status) {
    throw new Error(
      `Status with code '${code}' and scope 'ENTITY' not found in database. Please ensure the database is properly seeded.`
    );
  }

  return status.id;
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
  const statusId = await getTestEntityStatusId(prisma);

  return await prisma.methodologyVersion.create({
    data: {
      countryId,
      name: options?.name ?? "Empty Methodology for Testing",
      description:
        options?.description ??
        "A methodology with no subcategories for testing purposes",
      statusId,
    },
    select: { id: true },
  });
}
