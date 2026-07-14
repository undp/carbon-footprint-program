import type { PrismaClient } from "@repo/database";
import type {
  GetMyOrganizationsSelectorOptionsResponse,
  User,
} from "@repo/types";
import { MembershipStatus } from "@repo/database";

export const getMyOrganizationsSelectorOptionsService = async (
  prismaClient: PrismaClient,
  _query: null,
  user: User | null
): Promise<GetMyOrganizationsSelectorOptionsResponse> => {
  if (!user) {
    return [];
  }

  const organizations = await prismaClient.organizationSummaryView.findMany({
    where: {
      organization: {
        memberships: {
          some: {
            userId: BigInt(user.id),
            status: MembershipStatus.ACTIVE,
          },
        },
      },
    },
  });

  return organizations.map((org) => ({
    id: org.organizationId.toString(),
    name: org.name,
    isAccredited: org.isAccredited,
    lastSubmissionStatus: org.lastSubmissionStatus,
  }));
};
