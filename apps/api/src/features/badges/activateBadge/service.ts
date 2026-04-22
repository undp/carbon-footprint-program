import { type PrismaClient, BadgeStatus } from "@repo/database";
import type { BlobServiceClient } from "@azure/storage-blob";
import type { ActivateBadgeResponse } from "@repo/types";
import { BadgeNotFoundError } from "../errors.js";
import { buildCatalogEntryForType } from "../helpers.js";

export const activateBadgeService = async (
  prisma: PrismaClient,
  blobServiceClient: BlobServiceClient,
  containerName: string,
  id: string
): Promise<ActivateBadgeResponse> => {
  const badgeId = BigInt(id);

  const targetType = await prisma.$transaction(async (tx) => {
    const badge = await tx.badge.findUnique({ where: { id: badgeId } });
    if (!badge) throw new BadgeNotFoundError(id);

    if (badge.status === BadgeStatus.ACTIVE) {
      return badge.type;
    }

    await tx.badge.updateMany({
      where: { type: badge.type, status: BadgeStatus.ACTIVE },
      data: { status: BadgeStatus.INACTIVE },
    });

    await tx.badge.update({
      where: { id: badgeId },
      data: { status: BadgeStatus.ACTIVE },
    });

    return badge.type;
  });

  return buildCatalogEntryForType(prisma, blobServiceClient, containerName, targetType);
};
