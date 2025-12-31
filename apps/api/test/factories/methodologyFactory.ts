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
