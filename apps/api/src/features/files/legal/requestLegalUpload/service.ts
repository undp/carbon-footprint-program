import { randomUUID } from "crypto";
import {
  FileType,
  type RequestLegalUploadBody,
  type RequestLegalUploadResponse,
} from "@repo/types";
import { buildBlobPath } from "../../helpers/buildBlobPath.js";
import { buildPresignedUploadResponse } from "../../helpers/buildPresignedUploadResponse.js";
import { LEGAL_TERMS_CONDITIONS_GROUP_KEY } from "@repo/constants";
import type { StorageAdapter } from "@repo/storage";

type RequestLegalUploadInput = RequestLegalUploadBody;

export const requestLegalUploadService = async (
  storage: StorageAdapter,
  input: RequestLegalUploadInput
): Promise<RequestLegalUploadResponse> => {
  const { originalName } = input;

  const fileUuid = randomUUID();
  const blobPath = buildBlobPath({
    fileType: FileType.LEGAL,
    groupKey: LEGAL_TERMS_CONDITIONS_GROUP_KEY,
    uuid: fileUuid,
    name: originalName,
  });

  return buildPresignedUploadResponse(storage, blobPath, fileUuid);
};
