import type { PrismaClient } from "@repo/database";
import type { BlobServiceClient } from "@azure/storage-blob";
import { FileStatus } from "@repo/types";
import type { DownloadFileResponse } from "@repo/types";
import { FileNotFoundError } from "../errors.js";
import { generateReadSasUrl } from "../../../services/blobService.js";

export const downloadFileService = async (
  prisma: PrismaClient,
  blobServiceClient: BlobServiceClient,
  containerName: string,
  uuid: string
): Promise<DownloadFileResponse> => {
  const file = await prisma.file.findUnique({
    where: { uuid, status: FileStatus.ACTIVE },
  });
  if (!file) throw new FileNotFoundError(uuid);

  const { url, expiresAt } = await generateReadSasUrl(
    blobServiceClient,
    containerName,
    file.blobPath,
    {
      contentType: file.mimeType,
      contentDisposition: `attachment; filename="${encodeURIComponent(file.originalName)}"; filename*=UTF-8''${encodeURIComponent(file.originalName)}`,
    }
  );

  return { url, expiresAt: expiresAt.toISOString() };
};
