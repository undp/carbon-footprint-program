import { randomUUID } from "crypto";
import { FileType, type RequestLineFileUploadResponse } from "@repo/types";
import { buildBlobPath } from "@/features/files/helpers/buildBlobPath.js";
import { buildPresignedUploadResponse } from "@/features/files/helpers/buildPresignedUploadResponse.js";
import type { StorageAdapter } from "@/services/storage/index.js";

interface RequestLineFileUploadInput {
  carbonInventoryId: string;
  originalName: string;
}

export const requestLineFileUploadService = async (
  storage: StorageAdapter,
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

  return buildPresignedUploadResponse(storage, blobPath, fileUuid);
};
