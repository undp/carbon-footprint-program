import type { PrismaClient } from "@repo/database";
import type { BlobServiceClient } from "@azure/storage-blob";
import { FileStatus } from "@repo/types";
import type { SasUrlResponse } from "@repo/types";
import { FileNotFoundError } from "../shared/errors.js";
import { generateReadSasUrl } from "../shared/sasHelper.js";
import {
  AZURE_STORAGE_ACCOUNT_NAME,
  AZURE_STORAGE_CONTAINER_NAME,
} from "@/config/environment.js";

export const downloadFileService = async (
  prisma: PrismaClient,
  blobServiceClient: BlobServiceClient,
  uuid: string
): Promise<SasUrlResponse> => {
  const file = await prisma.file.findUnique({
    where: { uuid, status: FileStatus.ACTIVE },
  });
  if (!file) throw new FileNotFoundError(uuid);

  const { url, expiresAt } = await generateReadSasUrl(
    blobServiceClient,
    AZURE_STORAGE_ACCOUNT_NAME!,
    AZURE_STORAGE_CONTAINER_NAME,
    file.blobPath,
    15,
    {
      contentType: file.mimeType,
      contentDisposition: `attachment; filename="${encodeURIComponent(file.originalName)}"`,
    }
  );

  return { url, expiresAt: expiresAt.toISOString() };
};
