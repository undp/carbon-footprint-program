import { randomUUID } from "crypto";
import {
  type RequestUploadBody,
  type RequestUploadResponse,
} from "@repo/types";
import { buildBlobPath } from "../helpers/buildBlobPath.js";
import { buildPresignedUploadResponse } from "../helpers/buildPresignedUploadResponse.js";
import type { StorageAdapter } from "@repo/storage";

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

  return buildPresignedUploadResponse(storage, blobPath, fileUuid);
};
