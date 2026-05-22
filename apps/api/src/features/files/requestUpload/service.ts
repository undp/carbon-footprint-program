import { randomUUID } from "crypto";
import type { BlobServiceClient } from "@azure/storage-blob";
import type { PrismaClient } from "@repo/database";
import {
  type RequestUploadBody,
  type RequestUploadResponse,
} from "@repo/types";
import { buildBlobPath } from "../helpers/buildBlobPath.js";
import { getFileUploadLimits } from "../helpers/getFileUploadLimits.js";
import { validateFileUploadDeclaration } from "../helpers/validateFileUploadDeclaration.js";
import { generateWriteSasUrl } from "@/services/blobService.js";

type RequestUploadInput = RequestUploadBody;

export const requestUploadService = async (
  prisma: PrismaClient,
  blobServiceClient: BlobServiceClient,
  containerName: string,
  input: RequestUploadInput
): Promise<RequestUploadResponse> => {
  const { originalName, fileType, sizeBytes, mimeType } = input;

  const limits = await getFileUploadLimits(prisma, fileType);
  validateFileUploadDeclaration(
    { fileType, originalName, sizeBytes, mimeType },
    limits
  );

  const fileUuid = randomUUID();
  const blobPath = buildBlobPath({
    fileType,
    groupKey: "tmp",
    uuid: fileUuid,
    name: originalName,
  });

  const { url, expiresAt } = await generateWriteSasUrl(
    blobServiceClient,
    containerName,
    blobPath
  );

  return {
    uuid: fileUuid,
    uploadUrl: url,
    expiresAt: expiresAt.toISOString(),
  };
};
