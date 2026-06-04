import type { PrismaClient } from "@repo/database";
import { FileStatus } from "@repo/types";
import type { PreviewFileResponse } from "@repo/types";
import { FileNotFoundError } from "../errors.js";
import type { StorageAdapter } from "@/services/storage/index.js";

export const previewFileService = async (
  prisma: PrismaClient,
  storage: StorageAdapter,
  uuid: string
): Promise<PreviewFileResponse> => {
  // TODO: Add actorId param and scope query by ownership/permission relation.
  // Distinguish FileNotFoundError (404) from AuthorizationError (403) on null.
  const file = await prisma.file.findUnique({
    where: { uuid, status: FileStatus.ACTIVE },
  });
  if (!file) throw new FileNotFoundError(uuid);

  const { url, expiresAt } = await storage.generateReadUrl(file.blobPath, {
    contentType: file.mimeType,
  });

  return { url, expiresAt: expiresAt.toISOString() };
};
