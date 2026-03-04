import type { PrismaClient } from "@repo/database";
import type { BadgeType } from "@repo/database";
import { BadgeStatus } from "@repo/database";
import { FileStatus } from "@repo/types";
import { mapFileToResponse } from "../../mappers.js";
import type { GetBadgeFilesQuery, GetBadgeFilesResponse } from "@repo/types";

export const badgeGetFilesService = async (
  prisma: PrismaClient,
  badgeType: BadgeType,
  query?: GetBadgeFilesQuery
): Promise<GetBadgeFilesResponse> => {
  const badges = await prisma.badge.findMany({
    where: {
      type: badgeType,
      status: BadgeStatus.ACTIVE,
      file: {
        status: query?.status ?? FileStatus.ACTIVE,
      },
    },
    include: {
      file: true,
    },
    orderBy: { file: { createdAt: "desc" } },
  });

  return badges.map((badge) => mapFileToResponse(badge.file));
};
