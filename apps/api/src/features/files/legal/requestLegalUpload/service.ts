import { randomUUID } from "crypto";
import type { BlobServiceClient } from "@azure/storage-blob";
import {
  FileType,
  type RequestLegalUploadBody,
  type RequestLegalUploadResponse,
} from "@repo/types";
import { buildBlobPath } from "../../helpers/buildBlobPath.js";
import { generateWriteSasUrl } from "@/services/blobService.js";
import { LEGAL_TERMS_CONDITIONS_GROUP_KEY } from "@repo/constants";

type RequestLegalUploadInput = RequestLegalUploadBody;

export const requestLegalUploadService = async (
  blobServiceClient: BlobServiceClient,
  containerName: string,
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
