import {
  MembershipStatus,
  OrganizationDataStatus,
  type PrismaClient,
} from "@repo/database";
import type { GetMyOrganizationsResponse } from "@repo/types";

export const getMyOrganizationsService = async (
  prismaClient: PrismaClient
): Promise<GetMyOrganizationsResponse> => {
  // 1. Find user by idpUserId
  // TODO: add user association
  // const user = await prismaClient.user.findFirst({
  //   where: { idpUserId },
  // });

  // if (!user) {
  //   throw new UserNotFoundError(idpUserId);
  // }

  // 2. Find all ACTIVE memberships for this user with organization data
  const memberships = await prismaClient.userOrganizationMembership.findMany({
    where: {
      // TODO: add user association
      // userId: user.id,
      status: MembershipStatus.ACTIVE,
    },
    include: {
      organization: {
        include: {
          data: {
            where: {
              status: {
                in: [
                  OrganizationDataStatus.COMPLETED,
                  OrganizationDataStatus.DRAFT,
                  OrganizationDataStatus.SUBMITTED,
                ],
              },
            },
            orderBy: [
              { status: "asc" }, // COMPLETED first (if enum order allows, otherwise we might need manual sorting or separate queries)
              { id: "desc" }, // Latest by id
            ],
          },
        },
      },
    },
  });

  // 3. Map to response format with computed label
  return memberships.map((membership) => {
    const org = membership.organization;

    // Manual sorting to ensure COMPLETED is prioritized if Prisma enum order is not 'asc' for COMPLETED
    // TODO: check the sorting rules with Luis
    const sortedData = [...org.data].sort((a, b) => {
      if (
        a.status === OrganizationDataStatus.COMPLETED &&
        b.status !== OrganizationDataStatus.COMPLETED
      )
        return -1;
      if (
        a.status !== OrganizationDataStatus.COMPLETED &&
        b.status === OrganizationDataStatus.COMPLETED
      )
        return 1;
      return Number(b.id - a.id); // Latest first
    });

    const orgData = sortedData[0];
    const name =
      orgData?.tradeName || orgData?.legalName || orgData?.taxId || "N/A";

    return {
      id: org.id.toString(),
      name,
    };
  });
};
