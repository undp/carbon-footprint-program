import type { PrismaClient } from "@repo/database";
import type { BlobServiceClient } from "@azure/storage-blob";
import { FileStatus } from "@repo/types";
import type { PreviewFileResponse } from "@repo/types";
import { FileNotFoundError } from "../errors.js";
import { generateReadSasUrl } from "../helpers/sasHelper.js";

export const previewFileService = async (
  prisma: PrismaClient,
  blobServiceClient: BlobServiceClient,
  accountName: string,
  containerName: string,
  uuid: string
): Promise<PreviewFileResponse> => {
  const file = await prisma.file.findUnique({
    where: { uuid, status: FileStatus.ACTIVE },
  });
  if (!file) throw new FileNotFoundError(uuid);

  const { url, expiresAt } = await generateReadSasUrl(
    blobServiceClient,
    accountName,
    containerName,
    file.blobPath,
    { contentType: file.mimeType }
  );

  return { url, expiresAt: expiresAt.toISOString() };
};
