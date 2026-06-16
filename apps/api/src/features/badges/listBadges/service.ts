import type { PrismaClient } from "@repo/database";
import type { ListBadgesResponse } from "@repo/types";
import { BadgeType } from "@repo/database";
import { buildAllBadgeCatalogEntries } from "../helpers.js";
import type { StorageAdapter } from "@repo/storage";

export async function listBadgesService(
  prisma: PrismaClient,
  storage: StorageAdapter
): Promise<ListBadgesResponse> {
  const badges = await prisma.badge.findMany({
    include: {
      file: {
        select: { originalName: true, mimeType: true, blobPath: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const byType = new Map<BadgeType, typeof badges>(
    Object.values(BadgeType).map((t) => [t, []])
  );
  for (const badge of badges) {
    byType.get(badge.type)!.push(badge);
  }

  return buildAllBadgeCatalogEntries(byType, storage);
}
