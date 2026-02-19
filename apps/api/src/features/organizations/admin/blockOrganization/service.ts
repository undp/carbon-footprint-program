import type { PrismaClient } from "@repo/database";
import type { BlockOrganizationResponse, User } from "@repo/types";
import { OrganizationNotFoundError } from "../../errors.js";
import { OrganizationStatus } from "@repo/database";

/**
 * Block an organization by setting its status to BLOCKED.
 */
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
  await prismaClient.organization.update({
    where: {
      id: BigInt(organizationId),
    },
    data: {
      status: OrganizationStatus.BLOCKED,
      updatedById: user ? BigInt(user.id) : undefined,
    },
  });

  return {
    organizationId: organizationId,
  };
};
