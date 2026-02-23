import type { PrismaClient } from "@repo/database";
import type { GetOrganizationUsersResponse } from "@repo/types";
import { MembershipStatus, OrganizationRole } from "@repo/database/enums";
import { OrganizationNotFoundError } from "../../errors.js";

// Role priority for sorting (lower number = higher priority)
const ROLE_PRIORITY: Record<OrganizationRole, number> = {
  [OrganizationRole.ORGANIZATION_ADMIN]: 1,
  [OrganizationRole.EXTERNAL_VERIFIER]: 2,
  [OrganizationRole.EXTERNAL_CONSULTANT]: 3,
  [OrganizationRole.ORGANIZATION_CONTRIBUTOR]: 4,
  [OrganizationRole.VIEWER]: 5,
};

export const getOrganizationUsersService = async (
  prismaClient: PrismaClient,
  organizationId: string,
  userId: string
): Promise<GetOrganizationUsersResponse> => {
  // Verify organization exists
  const organization = await prismaClient.organization.findUnique({
    where: {
      id: BigInt(organizationId),
    },
  });

  if (!organization) {
    throw new OrganizationNotFoundError(organizationId);
  }

  // Query memberships with user details
  const memberships = await prismaClient.userOrganizationMembership.findMany({
    where: {
      organizationId: organization.id,
      status: MembershipStatus.ACTIVE,
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
        },
      },
    },
  });

  // Map to response format and sort
  const users = memberships
    .map((membership) => {
      // Construct name from firstName + lastName, fallback to email
      let name = "";
      if (membership.user.firstName || membership.user.lastName) {
        name = [membership.user.firstName, membership.user.lastName]
          .filter(Boolean)
          .join(" ")
          .trim();
      }
      if (!name) {
        name = membership.user.email || "";
      }

      return {
        userId: membership.user.id.toString(),
        name,
        email: membership.user.email || "",
        organizationRole: membership.role,
        isCurrentUser: BigInt(membership.user.id) === BigInt(userId),
      };
    })
    .sort((a, b) => {
      // Sort by role priority first
      const roleDiff =
        ROLE_PRIORITY[a.organizationRole] - ROLE_PRIORITY[b.organizationRole];
      if (roleDiff !== 0) return roleDiff;

      // Then by name
      return a.name.localeCompare(b.name);
    });

  return {
    users,
  };
};
