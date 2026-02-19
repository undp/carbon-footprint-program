import { randomUUID } from "crypto";
import type { PrismaClient } from "@repo/database";
import type { BlobServiceClient } from "@azure/storage-blob";
import type { FileType, RequestUploadResponse } from "@repo/types";
import { validateFileTypeExists, buildBlobPath } from "../helpers.js";
import { generateWriteSasUrl } from "../sasHelper.js";
import {
  AZURE_STORAGE_ACCOUNT_NAME,
  AZURE_STORAGE_CONTAINER_NAME,
} from "@/config/environment.js";

interface RequestUploadInput {
  fileType: FileType;
  ownerId: string;
  originalName: string;
  mimeType: string;
}

export const requestUploadService = async (
  prisma: PrismaClient,
  blobServiceClient: BlobServiceClient,
  input: RequestUploadInput
): Promise<RequestUploadResponse> => {
  const { fileType, ownerId, originalName } = input;
  const ownerIdBigInt = BigInt(ownerId);

  await validateFileTypeExists(prisma, fileType, ownerIdBigInt);

  const fileUuid = randomUUID();
  const blobPath = buildBlobPath(fileType, ownerId, fileUuid, originalName);

  const { url, expiresAt } = await generateWriteSasUrl(
    blobServiceClient,
    AZURE_STORAGE_ACCOUNT_NAME!,
    AZURE_STORAGE_CONTAINER_NAME,
    blobPath
  );

  return {
    uuid: fileUuid,
    uploadUrl: url,
    expiresAt: expiresAt.toISOString(),
  };
};
