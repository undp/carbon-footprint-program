import { type PrismaClient, BadgeType } from "@repo/database";
import type { BlobServiceClient } from "@azure/storage-blob";
import type { ListBadgesResponse } from "@repo/types";
import { buildCatalogEntryForType } from "../helpers.js";

export const listBadgesService = async (
  prisma: PrismaClient,
  blobServiceClient: BlobServiceClient,
  containerName: string
): Promise<ListBadgesResponse> => {
  const allTypes = Object.values(BadgeType);

  return Promise.all(
    allTypes.map((type) =>
      buildCatalogEntryForType(prisma, blobServiceClient, containerName, type)
    )
  );
};
