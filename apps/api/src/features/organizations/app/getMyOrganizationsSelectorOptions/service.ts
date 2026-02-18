import type { PrismaClient } from "@repo/database";
import type { MyOrganizationsSelectorOptionsResponse } from "@repo/types";
import { MembershipStatus } from "@repo/database";

export const getMyOrganizationsService = async (
  prismaClient: PrismaClient,
  userId: string
): Promise<MyOrganizationsSelectorOptionsResponse> => {
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
