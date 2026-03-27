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
  organizationUserId: string,
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
      userId: BigInt(organizationUserId),
      organizationId: organization.id,
      status: MembershipStatus.ACTIVE,
    },
  });

  if (!membership) {
    throw new MembershipNotFoundError();
  }

  // Prevent updating own role
  if (currentUser && BigInt(organizationUserId) === BigInt(currentUser.id)) {
    throw new CannotModifySelfError();
  }

  // Mark the current membership as OUTDATED and create a new ACTIVE one
  // in a transaction for traceability
  const newMembership = await prismaClient.$transaction(async (tx) => {
    // If demoting from admin, ensure they're not the last admin
    if (
      membership.role === OrganizationRole.ADMIN &&
      data.role !== OrganizationRole.ADMIN
    ) {
      const adminCount = await tx.userOrganizationMembership.count({
        where: {
          organizationId: organization.id,
          role: OrganizationRole.ADMIN,
          status: MembershipStatus.ACTIVE,
        },
      });

      if (adminCount <= 1) {
        throw new CannotRemoveLastAdminError();
      }
    }

    // Mark current membership as OUTDATED
    await tx.userOrganizationMembership.update({
      where: { id: membership.id },
      data: {
        status: MembershipStatus.OUTDATED,
        updatedById: currentUser ? BigInt(currentUser.id) : undefined,
      },
    });

    // Create new membership with updated role
    return await tx.userOrganizationMembership.create({
      data: {
        userId: membership.userId,
        organizationId: organization.id,
        role: data.role,
        status: MembershipStatus.ACTIVE,
        createdById: currentUser ? BigInt(currentUser.id) : undefined,
      },
    });
  });

  return {
    membershipId: newMembership.id.toString(),
    role: newMembership.role,
  };
};
