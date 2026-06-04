import type { PrismaClient } from "@repo/database";
import { Prisma } from "@repo/database";
import { BadgeStatus } from "@repo/database";
import type { ActivateBadgeResponse } from "@repo/types";
import { ResourceNotFoundError } from "@/errors/index.js";
import { buildBadgeCatalogEntry } from "../helpers.js";
import type { StorageAdapter } from "@/services/storage/index.js";

export async function activateBadgeService(
  prisma: PrismaClient,
  storage: StorageAdapter,
  id: string
): Promise<ActivateBadgeResponse> {
  const badgeId = BigInt(id);

  const { type, updatedBadges } = await prisma.$transaction(
    async (tx) => {
      const badge = await tx.badge.findUnique({
        where: { id: badgeId },
        select: { id: true, type: true, status: true },
      });

      if (!badge) {
        throw new ResourceNotFoundError("Badge", id);
      }

      if (badge.status !== BadgeStatus.ACTIVE) {
        await tx.badge.updateMany({
          where: { type: badge.type, status: BadgeStatus.ACTIVE },
          data: { status: BadgeStatus.INACTIVE },
        });

        await tx.badge.update({
          where: { id: badgeId },
          data: { status: BadgeStatus.ACTIVE },
        });
      }

      const badges = await tx.badge.findMany({
        where: { type: badge.type },
        include: {
          file: {
            select: { originalName: true, mimeType: true, blobPath: true },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      return { type: badge.type, updatedBadges: badges };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
  );

  const signUrl = await storage.createReadUrlSigner();
  return buildBadgeCatalogEntry(type, updatedBadges, signUrl);
}
