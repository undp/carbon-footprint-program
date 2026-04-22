import { type PrismaClient, BadgeStatus } from "@repo/database";
import type { BlobServiceClient } from "@azure/storage-blob";
import type { DeactivateBadgeResponse } from "@repo/types";
import { BadgeNotFoundError } from "../errors.js";
import { buildCatalogEntryForType } from "../helpers.js";

export const deactivateBadgeService = async (
  prisma: PrismaClient,
  blobServiceClient: BlobServiceClient,
  containerName: string,
  id: string
): Promise<DeactivateBadgeResponse> => {
  const badgeId = BigInt(id);

  const targetType = await prisma.$transaction(async (tx) => {
    const badge = await tx.badge.findUnique({ where: { id: badgeId } });
    if (!badge) throw new BadgeNotFoundError(id);

    if (badge.status === BadgeStatus.INACTIVE) {
      return badge.type;
    }

    await tx.badge.update({
      where: { id: badgeId },
      data: { status: BadgeStatus.INACTIVE },
    });

    return badge.type;
  });

  return buildCatalogEntryForType(prisma, blobServiceClient, containerName, targetType);
};
