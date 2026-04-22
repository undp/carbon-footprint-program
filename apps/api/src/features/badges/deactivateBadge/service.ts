import type { PrismaClient } from "@repo/database";
import type { BlobServiceClient } from "@azure/storage-blob";
import { BadgeStatus } from "@repo/database";
import type { DeactivateBadgeResponse } from "@repo/types";
import { ResourceNotFoundError } from "@/errors/index.js";
import { createReadSasUrlSigner } from "@/services/blobService.js";
import { buildBadgeCatalogEntry } from "../helpers.js";

export async function deactivateBadgeService(
  prisma: PrismaClient,
  blobServiceClient: BlobServiceClient,
  containerName: string,
  id: string
): Promise<DeactivateBadgeResponse> {
  const badgeId = BigInt(id);

  const { type } = await prisma.$transaction(async (tx) => {
    const badge = await tx.badge.findUnique({
      where: { id: badgeId },
      select: { id: true, type: true, status: true },
    });

    if (!badge) {
      throw new ResourceNotFoundError("Badge", id);
    }

    if (badge.status === BadgeStatus.INACTIVE) {
      return badge;
    }

    await tx.badge.update({
      where: { id: badgeId },
      data: { status: BadgeStatus.INACTIVE },
    });

    return badge;
  });

  const updatedBadges = await prisma.badge.findMany({
    where: { type },
    include: {
      file: {
        select: { originalName: true, mimeType: true, blobPath: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const signUrl = await createReadSasUrlSigner(
    blobServiceClient,
    containerName
  );
  return buildBadgeCatalogEntry(type, updatedBadges, signUrl);
}
