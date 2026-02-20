import {
  PrismaClient,
  UserOrganizationMembership,
  MembershipStatus,
} from "@repo/database";

/**
 * Gets a default organization role ID for testing
 * Uses ACCREDITED_MEMBER as the default role
 */
export async function getTestOrganizationRoleId(
  prisma: PrismaClient
): Promise<bigint> {
  const role = await prisma.role.findFirst({
    where: {
      name: "ACCREDITED_MEMBER",
    },
  });

  if (!role) {
    throw new Error(
      "ACCREDITED_MEMBER role not found. Ensure database is seeded."
    );
  }

  return role.id;
}

/**
 * Creates a test membership between a user and an organization
 */
export async function createTestMembership(
  prisma: PrismaClient,
  userId: bigint,
  organizationId: bigint,
  overrides?: Partial<UserOrganizationMembership>
): Promise<UserOrganizationMembership> {
  const organizationRoleId = await getTestOrganizationRoleId(prisma);

  return await prisma.userOrganizationMembership.create({
    data: {
      userId,
      organizationId,
      organizationRoleId,
      status: MembershipStatus.ACTIVE,
      ...overrides,
    },
  });
}

/**
 * Cleans up test memberships
 */
export async function cleanupTestMemberships(
  prisma: PrismaClient
): Promise<void> {
  await prisma.userOrganizationMembership.deleteMany();
}
