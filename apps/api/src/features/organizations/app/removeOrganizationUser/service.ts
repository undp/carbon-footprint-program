import type { PrismaClient } from "@repo/database";
import type { User, RemoveOrganizationUserResponse } from "@repo/types";
import { MembershipStatus, OrganizationRole } from "@repo/database/enums";
import { OrganizationNotFoundError } from "../../errors.js";
import {
  MembershipNotFoundError,
  CannotModifySelfError,
  CannotRemoveLastAdminError,
} from "../errors.js";

export const removeOrganizationUserService = async (
  prismaClient: PrismaClient,
  organizationId: string,
  userId: string,
  currentUser: User | null
): Promise<RemoveOrganizationUserResponse> => {
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

  // Prevent removing self
  if (currentUser && BigInt(userId) === BigInt(currentUser.id)) {
    throw new CannotModifySelfError();
  }

  // If user is an admin, check if they're the last admin and perform update
  // in a transaction to prevent race conditions
  if (membership.role === OrganizationRole.ORGANIZATION_ADMIN) {
    await prismaClient.$transaction(async (tx) => {
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

      // Soft delete: update membership status to DELETED
      await tx.userOrganizationMembership.update({
        where: {
          id: membership.id,
        },
        data: {
          status: MembershipStatus.DELETED,
          updatedById: currentUser ? BigInt(currentUser.id) : undefined,
        },
      });
    });
  } else {
    // Non-admin users can be removed without transaction
    await prismaClient.userOrganizationMembership.update({
      where: {
        id: membership.id,
      },
      data: {
        status: MembershipStatus.DELETED,
        updatedById: currentUser ? BigInt(currentUser.id) : undefined,
      },
    });
  }

  return {};
};
