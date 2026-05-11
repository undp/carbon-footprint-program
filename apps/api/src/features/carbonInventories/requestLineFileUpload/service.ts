import { randomUUID } from "crypto";
import type { BlobServiceClient } from "@azure/storage-blob";
import { FileType, type RequestLineFileUploadResponse } from "@repo/types";
import { buildBlobPath } from "@/features/files/helpers/buildBlobPath.js";
import { generateWriteSasUrl } from "@/services/blobService.js";

interface RequestLineFileUploadInput {
  carbonInventoryId: string;
  originalName: string;
}

export const requestLineFileUploadService = async (
  blobServiceClient: BlobServiceClient,
  containerName: string,
  input: RequestLineFileUploadInput
): Promise<RequestLineFileUploadResponse> => {
  const { carbonInventoryId, originalName } = input;

  const fileUuid = randomUUID();
  const blobPath = buildBlobPath({
    fileType: FileType.CARBON_INVENTORY,
    groupKey: carbonInventoryId,
    subPath: "LINES",
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
