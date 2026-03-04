import type { PrismaClient } from "@repo/database";
import type {
  AddOrganizationUserBody,
  AddOrganizationUserResponse,
  User,
} from "@repo/types";
import { MembershipStatus } from "@repo/database/enums";
import { OrganizationNotFoundError } from "../../errors.js";
import {
  UserNotFoundByEmailError,
  MembershipAlreadyExistsError,
} from "../errors.js";

export const addOrganizationUserService = async (
  prismaClient: PrismaClient,
  organizationId: string,
  data: AddOrganizationUserBody,
  user: User | null
): Promise<AddOrganizationUserResponse> => {
  // Verify organization exists
  const organization = await prismaClient.organization.findUnique({
    where: {
      id: BigInt(organizationId),
    },
  });

  if (!organization) {
    throw new OrganizationNotFoundError(organizationId);
  }

  // Find user by email
  const targetUser = await prismaClient.user.findUnique({
    where: {
      email: data.email,
    },
  });

  if (!targetUser) {
    throw new UserNotFoundByEmailError(data.email);
  }

  // Check for existing ACTIVE membership
  const existingMembership =
    await prismaClient.userOrganizationMembership.findFirst({
      where: {
        userId: targetUser.id,
        organizationId: organization.id,
      },
    });

  if (existingMembership) {
    await prismaClient.userOrganizationMembership.update({
      where: {
        id: existingMembership.id,
      },
      data: {
        role: data.role,
        updatedById: user ? BigInt(user.id) : undefined,
        status: MembershipStatus.ACTIVE,
      },
    });

    return {
      membershipId: existingMembership.id.toString(),
      userId: targetUser.id.toString(),
      role: existingMembership.role,
    };
  }

  // Create membership with provided role
  const membership = await prismaClient.userOrganizationMembership.create({
    data: {
      userId: targetUser.id,
      organizationId: organization.id,
      role: data.role,
      status: MembershipStatus.ACTIVE,
      createdById: user ? BigInt(user.id) : undefined,
    },
  });

  return {
    membershipId: membership.id.toString(),
    userId: targetUser.id.toString(),
    role: membership.role,
  };
};
