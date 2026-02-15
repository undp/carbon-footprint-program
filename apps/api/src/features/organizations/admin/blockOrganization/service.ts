import type { PrismaClient } from "@repo/database";
import type { BlockOrganizationResponse } from "@repo/types";

/**
 * Block an organization by setting its status to BLOCKED.
 */
export const blockOrganizationService = async (
  prismaClient: PrismaClient,
  organizationId: string
): Promise<BlockOrganizationResponse> => {
  await prismaClient.organization.update({
    where: {
      id: BigInt(organizationId),
    },
    data: {
      status: "BLOCKED",
    },
  });

  return {};
};
