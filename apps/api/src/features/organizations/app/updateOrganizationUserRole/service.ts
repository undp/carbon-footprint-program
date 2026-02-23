import type { PrismaClient } from "@repo/database";
import type {
  UpdateOrganizationUserRoleBody,
  UpdateOrganizationUserRoleResponse,
  User,
} from "@repo/types";
import { MembershipStatus, OrganizationRole } from "@repo/database/enums";
import { OrganizationNotFoundError } from "../../errors.js";
import {
  MembershipNotFoundError,
  CannotModifySelfError,
  CannotRemoveLastAdminError,
} from "../errors.js";

export const updateOrganizationUserRoleService = async (
  prismaClient: PrismaClient,
  organizationId: string,
  userId: string,
  data: UpdateOrganizationUserRoleBody,
  currentUser: User | null
): Promise<UpdateOrganizationUserRoleResponse> => {
  // Verify organization exists
  const organization = await prismaClient.organization.findUnique({
    where: {
      id: BigInt(organizationId),
    },
  });

  if (!organization) {
    throw new OrganizationNotFoundError(organizationId);
  }

  // Find user's ACTIVE membership
  const membership = await prismaClient.userOrganizationMembership.findFirst({
    where: {
      userId: BigInt(userId),
      organizationId: organization.id,
      status: MembershipStatus.ACTIVE,
    },
  });

  if (!membership) {
    throw new MembershipNotFoundError();
  }

  // If user is currently an admin and being changed to non-admin role,
  // check if they're the last admin and perform update in a transaction
  // to prevent race conditions
  if (
    membership.role === OrganizationRole.ORGANIZATION_ADMIN &&
    data.role !== OrganizationRole.ORGANIZATION_ADMIN
  ) {
    const updatedMembership = await prismaClient.$transaction(async (tx) => {
      const adminCount = await tx.userOrganizationMembership.count({
        where: {
          organizationId: organization.id,
          role: OrganizationRole.ORGANIZATION_ADMIN,
          status: MembershipStatus.ACTIVE,
        },
      });

      if (adminCount <= 1) {
        throw new CannotRemoveLastAdminError();
      }

      // Prevent updating own role
      if (currentUser && userId === currentUser.id) {
        throw new CannotModifySelfError();
      }

      return await tx.userOrganizationMembership.update({
        where: {
          id: membership.id,
        },
        data: {
          role: data.role,
          updatedById: currentUser ? BigInt(currentUser.id) : undefined,
        },
      });
    });

    return {
      membershipId: updatedMembership.id.toString(),
      role: updatedMembership.role,
    };
  }

  // Non-admin role changes can be performed without transaction
  const updatedMembership =
    await prismaClient.userOrganizationMembership.update({
      where: {
        id: membership.id,
      },
      data: {
        role: data.role,
        updatedById: currentUser ? BigInt(currentUser.id) : undefined,
      },
    });

  return {
    membershipId: updatedMembership.id.toString(),
    role: updatedMembership.role,
  };
};
