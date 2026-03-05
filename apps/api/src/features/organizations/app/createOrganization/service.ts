import type { PrismaClient } from "@repo/database";
import type {
  CreateOrganizationBody,
  CreateOrganizationResponse,
  User,
} from "@repo/types";
import {
  OrganizationStatus,
  MembershipStatus,
  OrganizationRole,
} from "@repo/database";
import { createOrganizationData } from "../../helpers.js";
import { UserNotFoundError } from "../../../users/errors.js";
import { NoCountryFoundError } from "../../../methodologies/errors.js";

export const createOrganizationService = async (
  prismaClient: PrismaClient,
  body: CreateOrganizationBody,
  user: User | null
): Promise<CreateOrganizationResponse> => {
  // TODO: remove this if when handlerFactory folder is improved
  if (!user) {
    throw new UserNotFoundError();
  }
  // TODO: get this country from the user
  const country = await prismaClient.country.findFirst({
    orderBy: { id: "asc" },
  });

  if (!country) {
    throw new NoCountryFoundError();
  }

  return await prismaClient.$transaction(async (tx) => {
    // Create organization
    const organization = await tx.organization.create({
      data: {
        countryId: country.id,
        status: OrganizationStatus.ACTIVE,
        createdById: BigInt(user.id),
      },
    });

    // Create organization data
    await createOrganizationData(tx, organization.id.toString(), user.id, body);

    // Create membership
    await tx.userOrganizationMembership.create({
      data: {
        userId: BigInt(user.id),
        organizationId: organization.id,
        role: OrganizationRole.ADMIN,
        status: MembershipStatus.ACTIVE,
        createdById: BigInt(user.id),
      },
    });

    return { id: organization.id.toString() };
  });
};
