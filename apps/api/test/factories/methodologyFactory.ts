import type { PrismaClient } from "@repo/database";

/**
 * Gets the first methodology version from the database
 * This is useful for tests that need an existing methodology_version_id
 */
export async function getTestMethodologyVersion(
  prisma: PrismaClient
): Promise<{ id: bigint }> {
  const methodologyVersion = await prisma.methodology_version.findFirst({
    select: { id: true },
    orderBy: { id: "asc" },
  });

  if (!methodologyVersion) {
    throw new Error(
      "No methodology version found in database. " +
        "Please ensure the database is properly seeded with methodology versions before running tests."
    );
  }

  return methodologyVersion;
}
