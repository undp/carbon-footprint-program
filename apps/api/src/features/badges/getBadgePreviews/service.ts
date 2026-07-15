import { PrismaClient } from "@repo/database";
import { BadgeType, BadgeStatus, GetBadgePreviewsResponse } from "@repo/types";
import type { StorageAdapter } from "@repo/storage";

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
        /* v8 ignore next -- File.mimeType is NOT NULL in the DB schema, so the ?? undefined fallback is unreachable */
        { contentType: badge.file.mimeType ?? undefined }
      );

      return {
        badgeType: badge.type,
        previewUrl,
      };
    })
  );
};
