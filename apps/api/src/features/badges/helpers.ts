import { type PrismaClient, BadgeStatus, BadgeType } from "@repo/database";
import type { BlobServiceClient } from "@azure/storage-blob";
import type { BadgeCatalogEntry, BadgeDTO } from "@repo/types";
import { generateReadSasUrl } from "@/services/index.js";

const HISTORY_CAP = 20;

export async function buildBadgeDTOFromRecord(
  badge: {
    id: bigint;
    type: BadgeType;
    status: BadgeStatus;
    createdAt: Date;
    file: { originalName: string; mimeType: string; blobPath: string };
  },
  blobServiceClient: BlobServiceClient,
  containerName: string
): Promise<BadgeDTO> {
  const { url: previewUrl } = await generateReadSasUrl(
    blobServiceClient,
    containerName,
    badge.file.blobPath,
    { contentType: badge.file.mimeType }
  );

  return {
    id: badge.id.toString(),
    type: badge.type,
    status: badge.status,
    createdAt: badge.createdAt.toISOString(),
    fileName: badge.file.originalName,
    mimeType: badge.file.mimeType,
    previewUrl,
  };
}

export async function buildCatalogEntryForType(
  prisma: PrismaClient,
  blobServiceClient: BlobServiceClient,
  containerName: string,
  type: BadgeType
): Promise<BadgeCatalogEntry> {
  const badges = await prisma.badge.findMany({
    where: { type },
    include: {
      file: {
        select: { originalName: true, mimeType: true, blobPath: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const activeBadge = badges.find((b) => b.status === BadgeStatus.ACTIVE);
  const inactiveBadges = badges
    .filter((b) => b.status === BadgeStatus.INACTIVE)
    .slice(0, HISTORY_CAP);

  const [active, ...history] = await Promise.all([
    activeBadge
      ? buildBadgeDTOFromRecord(activeBadge, blobServiceClient, containerName)
      : Promise.resolve(null),
    ...inactiveBadges.map((b) =>
      buildBadgeDTOFromRecord(b, blobServiceClient, containerName)
    ),
  ]);

  return { type, active, history };
}
