import {
  PrismaClient,
  UserOrganizationMembership,
  MembershipStatus,
} from "@repo/database";

import { OrganizationRole } from "@repo/database/enums";

/**
 * Creates a test membership between a user and an organization
 */
export async function createTestMembership(
  prisma: PrismaClient,
  userId: bigint,
  organizationId: bigint,
  overrides?: Partial<UserOrganizationMembership>
): Promise<UserOrganizationMembership> {
  return await prisma.userOrganizationMembership.create({
    data: {
      userId,
      organizationId,
      role: OrganizationRole.ORGANIZATION_ADMIN,
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
