import type { PrismaClient } from "@repo/database";
import type {
  CreateOrganizationBody,
  CreateOrganizationResponse,
} from "@repo/types";
import { OrganizationStatus, MembershipStatus } from "@repo/database";
import { AdminRoleNotFoundError } from "../../errors.js";
import { createOrganizationData } from "../../helpers.js";

export const createOrganizationService = async (
  prismaClient: PrismaClient,
  userId: string,
  body: CreateOrganizationBody
): Promise<CreateOrganizationResponse> => {
  return await prismaClient.$transaction(async (tx) => {
    // 1. Get user's country from their job position
    const user = await tx.user.findUnique({
      where: { id: BigInt(userId) },
      include: { countryJobPosition: true },
    });

    if (!user?.countryJobPosition?.countryId) {
      throw new Error(
        "User must have a valid country job position to create an organization"
      );
    }

    // 2. Create organization
    const organization = await tx.organization.create({
      data: {
        countryId: user.countryJobPosition.countryId,
        status: OrganizationStatus.ACTIVE,
        createdById: BigInt(userId),
        updatedById: BigInt(userId),
      },
    });

    // 3. Create organization data
    await createOrganizationData(tx, organization.id.toString(), userId, body);

    // 4. Find ACCREDITED_MEMBER role to assign to the organization creator
    // Note: ACCREDITED_MEMBER is the organization-level role that grants full
    // management permissions within the organization (not to be confused with
    // system-level ADMIN role)
    const adminRole = await tx.organizationRole.findFirst({
      where: { role: { name: "ACCREDITED_MEMBER" } },
    });

    if (!adminRole) {
      throw new AdminRoleNotFoundError();
    }

    // 5. Create membership
    await tx.userOrganizationMembership.create({
      data: {
        userId: BigInt(userId),
        organizationId: organization.id,
        organizationRoleId: adminRole.id,
        status: MembershipStatus.ACTIVE,
        createdById: BigInt(userId),
        updatedById: BigInt(userId),
      },
    });

    return { id: organization.id.toString() };
  });
};
