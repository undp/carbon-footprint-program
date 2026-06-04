import { PrismaClient } from "@repo/database";
import { BadgeType, BadgeStatus, GetBadgePreviewsResponse } from "@repo/types";
import type { StorageAdapter } from "@/services/storage/index.js";

export const getBadgePreviewsService = async (
  prismaClient: PrismaClient,
  storage: StorageAdapter,
  badgeTypes?: BadgeType[]
): Promise<GetBadgePreviewsResponse> => {
  const badges = await prismaClient.badge.findMany({
    where: {
      status: BadgeStatus.ACTIVE,
      ...(badgeTypes?.length && { type: { in: badgeTypes } }),
    },
    include: {
      file: {
        select: { blobPath: true, mimeType: true },
      },
    },
  });

  return Promise.all(
    badges.map(async (badge) => {
      const { url: previewUrl } = await storage.generateReadUrl(
        badge.file.blobPath,
        { contentType: badge.file.mimeType ?? undefined }
      );

      return {
        badgeType: badge.type,
        previewUrl,
      };
    })
  );
};
