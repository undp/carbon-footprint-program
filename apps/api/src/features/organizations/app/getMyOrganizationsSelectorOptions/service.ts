import type { PrismaClient } from "@repo/database";
import type { GetMyOrganizationsSelectorOptionsResponse } from "@repo/types";
import { MembershipStatus } from "@repo/database";

export const getMyOrganizationsSelectorOptionsService = async (
  prismaClient: PrismaClient,
  userId: string
): Promise<GetMyOrganizationsSelectorOptionsResponse> => {
  const organizations = await prismaClient.organizationSummaryView.findMany({
    where: {
      organization: {
        memberships: {
          some: {
            userId: BigInt(userId),
            status: MembershipStatus.ACTIVE,
          },
        },
      },
    },
  });

  return organizations.map((org) => ({
    id: org.organizationId.toString(),
    name: org.name,
  }));
};
