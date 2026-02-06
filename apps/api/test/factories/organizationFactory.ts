import type { PrismaClient } from "@repo/database";

export async function getTestOrganizationId(
  prisma: PrismaClient
): Promise<bigint> {
  const organization = await prisma.organization.findFirst({
    select: { id: true },
  });

  if (!organization) {
    throw new Error(
      "No organization found in database. Please ensure the database is properly seeded."
    );
  }

  return organization.id;
}
