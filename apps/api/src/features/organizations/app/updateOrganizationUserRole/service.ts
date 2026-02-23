import type { PrismaClient } from "@repo/database";
import type {
  UpdateOrganizationUserRoleBody,
  UpdateOrganizationUserRoleResponse,
  User,
} from "@repo/types";
import { MembershipStatus } from "@repo/database/enums";
import { OrganizationNotFoundError } from "../../errors.js";
import { MembershipNotFoundError, CannotModifySelfError } from "../errors.js";

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

  // Prevent updating own role
  if (currentUser && userId === currentUser.id) {
    throw new CannotModifySelfError();
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

  // Update role
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
