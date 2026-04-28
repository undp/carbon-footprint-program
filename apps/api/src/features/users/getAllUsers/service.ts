import type { PrismaClient } from "@repo/database";
import { MembershipStatus } from "@repo/database/enums";
import type { GetAllUsersResponse } from "@repo/types";
import { mapUserToResponse } from "../mappers.js";

export const getAllUsersService = async (
  prismaClient: PrismaClient
): Promise<GetAllUsersResponse> => {
  const users = await prismaClient.user.findMany({
    include: {
      countryJobPosition: {
        select: { id: true, name: true },
      },
      memberships: {
        where: { status: MembershipStatus.ACTIVE },
        select: {
          role: true,
          organization: {
            select: {
              id: true,
              summary: { select: { name: true } },
            },
          },
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return users.map((user) => ({
    ...mapUserToResponse(user),
    jobPositionName: user.countryJobPosition?.name ?? null,
    organizations: user.memberships.map((m) => ({
      organizationId: m.organization.id.toString(),
      organizationName: m.organization.summary?.name ?? "",
      role: m.role,
    })),
  }));
};
