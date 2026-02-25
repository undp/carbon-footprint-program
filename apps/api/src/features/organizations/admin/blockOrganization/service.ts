import type { PrismaClient } from "@repo/database";
import type { BlockOrganizationResponse, User } from "@repo/types";
import { OrganizationNotFoundError } from "../../errors.js";
import { OrganizationAlreadyBlockedError } from "../errors.js";
import { OrganizationStatus } from "@repo/database";

export const blockOrganizationService = async (
  prismaClient: PrismaClient,
  organizationId: string,
  user: User | null
): Promise<BlockOrganizationResponse> => {
  const organization = await prismaClient.organization.findUnique({
    where: {
      id: BigInt(organizationId),
    },
  });

  if (!organization) {
    throw new OrganizationNotFoundError(organizationId);
  }

  const isBlocked = organization.status === OrganizationStatus.BLOCKED;

  if (isBlocked) {
    throw new OrganizationAlreadyBlockedError(organizationId);
  }

  await prismaClient.organization.update({
    where: {
      id: organization.id,
    },
    data: {
      status: OrganizationStatus.BLOCKED,
      updatedById: user ? BigInt(user.id) : undefined,
    },
  });

  return {
    organizationId,
  };
};
