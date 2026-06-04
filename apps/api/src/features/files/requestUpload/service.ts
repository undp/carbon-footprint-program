import { randomUUID } from "crypto";
import {
  type RequestUploadBody,
  type RequestUploadResponse,
} from "@repo/types";
import { buildBlobPath } from "../helpers/buildBlobPath.js";
import type { StorageAdapter } from "@/services/storage/index.js";

type RequestUploadInput = RequestUploadBody;

export const requestUploadService = async (
  storage: StorageAdapter,
  input: RequestUploadInput
): Promise<RequestUploadResponse> => {
  const { originalName, fileType } = input;

  const fileUuid = randomUUID();
  const blobPath = buildBlobPath({
    fileType,
    groupKey: "tmp",
    uuid: fileUuid,
    name: originalName,
  });

  const { url, method, headers, expiresAt } =
    await storage.generateWriteUrl(blobPath);

  return {
    uuid: fileUuid,
    uploadUrl: url,
    uploadMethod: method,
    uploadHeaders: headers,
    expiresAt: expiresAt.toISOString(),
  };
};
