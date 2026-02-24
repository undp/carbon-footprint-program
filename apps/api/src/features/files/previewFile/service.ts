import type { PrismaClient } from "@repo/database";
import type { BlobServiceClient } from "@azure/storage-blob";
import { FileStatus } from "@repo/types";
import type { PreviewFileResponse } from "@repo/types";
import { FileNotFoundError } from "../errors.js";
import { generateReadSasUrl } from "../helpers/sasHelper.js";
import {
  AZURE_STORAGE_ACCOUNT_NAME,
  AZURE_STORAGE_CONTAINER_NAME,
} from "@/config/environment.js";

export const previewFileService = async (
  prisma: PrismaClient,
  blobServiceClient: BlobServiceClient,
  uuid: string
): Promise<PreviewFileResponse> => {
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
    { contentType: file.mimeType }
  );

  return { url, expiresAt: expiresAt.toISOString() };
};
