import type { PrismaClient } from "@repo/database";
import type { BadgeType } from "@repo/database";
import { FileStatus } from "@repo/types";
import { validateBadgeType, findActiveBadgeByType } from "../helpers.js";
import { mapFileToResponse } from "../../mappers.js";
import type { GetBadgeFilesQuery, GetBadgeFilesResponse } from "@repo/types";

export const badgeGetFilesService = async (
  prisma: PrismaClient,
  badgeType: BadgeType,
  query?: GetBadgeFilesQuery
): Promise<GetBadgeFilesResponse> => {
  validateBadgeType(badgeType);

  const fileIds = await findActiveBadgeByType(prisma, badgeType);
  if (fileIds.length === 0) return [];

  const files = await prisma.file.findMany({
    where: {
      id: { in: fileIds },
      status: query?.status ?? FileStatus.ACTIVE,
    },
    orderBy: { createdAt: "desc" },
  });

  return files.map(mapFileToResponse);
};
