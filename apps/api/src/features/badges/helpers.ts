import type { Badge, File } from "@repo/database";
import { BadgeStatus, BadgeType } from "@repo/database";
import type { BlobServiceClient } from "@azure/storage-blob";
import { createReadSasUrlSigner } from "@/services/blobService.js";
import { BADGE_HISTORY_LIMIT } from "@repo/constants";
import type { BadgeCatalogEntry, BadgeDTO } from "@repo/types";

type BadgeWithFile = Badge & {
  file: Pick<File, "originalName" | "mimeType" | "blobPath">;
};

async function toBadgeDTO(
  badge: BadgeWithFile,
  signUrl: (
    blobPath: string,
    opts?: { contentType?: string }
  ) => Promise<{ url: string }>
): Promise<BadgeDTO> {
  const { url: previewUrl } = await signUrl(badge.file.blobPath, {
    contentType: badge.file.mimeType ?? undefined,
  });
  return {
    id: badge.id.toString(),
    type: badge.type,
    status: badge.status,
    createdAt: badge.createdAt.toISOString(),
    fileName: badge.file.originalName,
    mimeType: badge.file.mimeType ?? "",
    previewUrl,
  };
}

export async function buildBadgeCatalogEntry(
  type: BadgeType,
  badges: BadgeWithFile[],
  signUrl: (
    blobPath: string,
    opts?: { contentType?: string }
  ) => Promise<{ url: string }>
): Promise<BadgeCatalogEntry> {
  const active = badges.find((b) => b.status === BadgeStatus.ACTIVE) ?? null;
  const inactive = badges
    .filter((b) => b.status === BadgeStatus.INACTIVE)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, BADGE_HISTORY_LIMIT);

  const [activeDTO, historyDTOs] = await Promise.all([
    active ? toBadgeDTO(active, signUrl) : Promise.resolve(null),
    Promise.all(inactive.map((b) => toBadgeDTO(b, signUrl))),
  ]);

  return { type, active: activeDTO, history: historyDTOs };
}

export async function buildAllBadgeCatalogEntries(
  badgesByType: Map<BadgeType, BadgeWithFile[]>,
  blobServiceClient: BlobServiceClient,
  containerName: string
): Promise<BadgeCatalogEntry[]> {
  const signUrl = await createReadSasUrlSigner(
    blobServiceClient,
    containerName
  );

  return Promise.all(
    Object.values(BadgeType).map((type) => {
      const badges = badgesByType.get(type) ?? [];
      return buildBadgeCatalogEntry(type, badges, signUrl);
    })
  );
}
