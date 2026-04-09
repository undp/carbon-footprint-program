import { PrismaClient } from "@repo/database";
import { BadgeType, BadgeStatus, GetBadgePreviewsResponse } from "@repo/types";
import { BlobServiceClient } from "@azure/storage-blob";
import { generateReadSasUrl } from "@/services/index.js";

export const getBadgePreviewsService = async (
  prismaClient: PrismaClient,
  blobServiceClient: BlobServiceClient,
  containerName: string,
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
      const { url: previewUrl } = await generateReadSasUrl(
        blobServiceClient,
        containerName,
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
