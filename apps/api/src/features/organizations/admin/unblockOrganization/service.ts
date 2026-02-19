import type { PrismaClient } from "@repo/database";
import type { UnblockOrganizationResponse, User } from "@repo/types";
import {
  OrganizationNotFoundError,
  OrganizationAlreadyUnblockedError,
} from "../../errors.js";
import { OrganizationStatus } from "@repo/database";

export const unblockOrganizationService = async (
  prismaClient: PrismaClient,
  organizationId: string,
  user: User | null
): Promise<UnblockOrganizationResponse> => {
  const organization = await prismaClient.organization.findUnique({
    where: {
      id: BigInt(organizationId),
    },
  });

  if (!organization) {
    throw new OrganizationNotFoundError(organizationId);
  }

  const isBlocked = organization.status === OrganizationStatus.BLOCKED;

  if (!isBlocked) {
    throw new OrganizationAlreadyUnblockedError(organizationId);
  }

  await prismaClient.organization.update({
    where: {
      id: organization.id,
    },
    data: {
      status: OrganizationStatus.ACTIVE,
      updatedById: user ? BigInt(user.id) : undefined,
    },
  });

  return {
    organizationId: organizationId,
  };
};
