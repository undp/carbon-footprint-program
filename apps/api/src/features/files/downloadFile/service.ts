import type { Readable } from "node:stream";
import type { PrismaClient } from "@repo/database";
import type { ContainerClient } from "@azure/storage-blob";
import { FileStatus } from "@repo/types";
import { FileNotFoundError } from "../errors.js";

interface DownloadResult {
  stream: Readable;
  mimeType: string;
  originalName: string;
}

export const downloadFileService = async (
  prisma: PrismaClient,
  blobStorage: ContainerClient,
  uuid: string
): Promise<DownloadResult> => {
  const file = await prisma.file.findUnique({
    where: { uuid, status: FileStatus.ACTIVE },
  });
  if (!file) throw new FileNotFoundError(uuid);

  const blobClient = blobStorage.getBlobClient(file.blobPath);
  const downloadResponse = await blobClient.download();

  return {
    stream: downloadResponse.readableStreamBody as unknown as Readable,
    mimeType: file.mimeType,
    originalName: file.originalName,
  };
};
