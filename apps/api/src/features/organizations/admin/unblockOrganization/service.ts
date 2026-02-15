import type { PrismaClient } from "@repo/database";
import type { UnblockOrganizationResponse } from "@repo/types";

/**
 * Unblock an organization by setting its status to ACTIVE.
 */
export const unblockOrganizationService = async (
  prismaClient: PrismaClient,
  organizationId: string
): Promise<UnblockOrganizationResponse> => {
  await prismaClient.organization.update({
    where: {
      id: BigInt(organizationId),
    },
    data: {
      status: "ACTIVE",
    },
  });

  return {};
};
