import type { PrismaClient } from "@repo/database";
import type { UnblockOrganizationResponse } from "@repo/types";
import { OrganizationNotFoundError } from "../../errors.js";
import { OrganizationStatus } from "@repo/database";

/**
 * Unblock an organization by setting its status to ACTIVE.
 */
export const unblockOrganizationService = async (
  prismaClient: PrismaClient,
  organizationId: string
): Promise<UnblockOrganizationResponse> => {
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
      status: OrganizationStatus.ACTIVE,
    },
  });

  return {};
};
