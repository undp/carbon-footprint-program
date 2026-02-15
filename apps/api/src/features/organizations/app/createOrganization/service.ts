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
    // 1. Create organization
    const organization = await tx.organization.create({
      data: {
        countryId: BigInt(1), // TODO: Get from user or use default
        status: OrganizationStatus.ACTIVE,
        createdById: BigInt(userId),
        updatedById: BigInt(userId),
      },
    });

    // 2. Create organization data
    await createOrganizationData(tx, organization.id.toString(), userId, body);

    // 3. Find ADMIN role
    const adminRole = await tx.organizationRole.findFirst({
      where: { role: { name: "ACCREDITED_MEMBER" } },
    });

    if (!adminRole) {
      throw new AdminRoleNotFoundError();
    }

    // 4. Create membership
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
