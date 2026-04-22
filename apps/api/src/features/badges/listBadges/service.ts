import type { PrismaClient } from "@repo/database";
import type { BlobServiceClient } from "@azure/storage-blob";
import type { ListBadgesResponse } from "@repo/types";
import { BadgeType, BadgeStatus } from "@repo/database";
import { buildAllBadgeCatalogEntries } from "../helpers.js";

export async function listBadgesService(
  prisma: PrismaClient,
  blobServiceClient: BlobServiceClient,
  containerName: string
): Promise<ListBadgesResponse> {
  const badges = await prisma.badge.findMany({
    include: {
      file: {
        select: { originalName: true, mimeType: true, blobPath: true },
      },
    },
    where: {
      OR: [{ status: BadgeStatus.ACTIVE }, { status: BadgeStatus.INACTIVE }],
    },
    orderBy: { createdAt: "desc" },
  });

  const byType = new Map<BadgeType, typeof badges>(
    Object.values(BadgeType).map((t) => [t as BadgeType, []])
  );
  for (const badge of badges) {
    byType.get(badge.type)!.push(badge);
  }

  return buildAllBadgeCatalogEntries(byType, blobServiceClient, containerName);
}
