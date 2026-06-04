import type { PrismaClient } from "@repo/database";
import { FileStatus } from "@repo/types";
import type { DownloadFileResponse } from "@repo/types";
import { FileNotFoundError } from "../errors.js";
import type { StorageAdapter } from "@/services/storage/index.js";

export const downloadFileService = async (
  prisma: PrismaClient,
  storage: StorageAdapter,
  uuid: string
): Promise<DownloadFileResponse> => {
  const file = await prisma.file.findUnique({
    where: { uuid, status: FileStatus.ACTIVE },
  });
  if (!file) throw new FileNotFoundError(uuid);

  const { url, expiresAt } = await storage.generateReadUrl(file.blobPath, {
    contentType: file.mimeType,
    contentDisposition: `attachment; filename="${encodeURIComponent(file.originalName)}"; filename*=UTF-8''${encodeURIComponent(file.originalName)}`,
  });

  return { url, expiresAt: expiresAt.toISOString() };
};
