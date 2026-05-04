import type { PrismaClient } from "@repo/database";
import { MembershipStatus } from "@repo/database/enums";
import type { GetAllUsersResponse } from "@repo/types";
import { SystemParameterKeyEnum } from "@repo/types";
import { ApplicationConfigError } from "@/errors/index.js";
import { getSystemParameterValue } from "../../../helpers/getSystemParameterValue.js";
import { mapUserToResponse } from "../mappers.js";

export const getAllUsersService = async (
  prismaClient: PrismaClient
): Promise<GetAllUsersResponse> => {
  const [users, thresholdValue] = await Promise.all([
    prismaClient.user.findMany({
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
    }),
    getSystemParameterValue(
      prismaClient,
      SystemParameterKeyEnum.USER_INACTIVE_THRESHOLD_DAYS
    ),
  ]);

  const thresholdDays = Number(thresholdValue);
  if (!Number.isInteger(thresholdDays) || thresholdDays <= 0) {
    throw new ApplicationConfigError(
      `${SystemParameterKeyEnum.USER_INACTIVE_THRESHOLD_DAYS} is not set or is invalid`
    );
  }
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - thresholdDays);

  return users.map((user) => ({
    ...mapUserToResponse(user),
    jobPositionName: user.countryJobPosition?.name ?? null,
    organizations: user.memberships.map((m) => ({
      organizationId: m.organization.id.toString(),
      organizationName: m.organization.summary?.name ?? "",
      role: m.role,
    })),
    active: user.lastAccessAt != null && user.lastAccessAt >= cutoffDate,
  }));
};
