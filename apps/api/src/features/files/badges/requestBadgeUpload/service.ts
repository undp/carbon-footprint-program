import { randomUUID } from "crypto";
import type { PrismaClient } from "@repo/database";
import type { BlobServiceClient } from "@azure/storage-blob";
import {
  FileType,
  RequestBadgeUploadBody,
  RequestBadgeUploadParams,
  RequestBadgeUploadResponse,
} from "@repo/types";
import { buildBlobPath } from "../../helpers/buildBlobPath.js";
import { generateWriteSasUrl } from "../../../../services/blobService.js";

type BadgeRequestUploadInput = RequestBadgeUploadBody &
  RequestBadgeUploadParams;

export const badgeRequestUploadService = async (
  _prisma: PrismaClient,
  blobServiceClient: BlobServiceClient,
  containerName: string,
  input: BadgeRequestUploadInput
): Promise<RequestBadgeUploadResponse> => {
  const { badgeType, originalName } = input;

  const fileUuid = randomUUID();
  const blobPath = buildBlobPath({
    fileType: FileType.BADGE,
    groupKey: badgeType,
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
