import { randomUUID } from "crypto";
import type { PrismaClient } from "@repo/database";
import {
  FileType,
  RequestBadgeUploadBody,
  RequestBadgeUploadParams,
  RequestBadgeUploadResponse,
} from "@repo/types";
import { buildBlobPath } from "../../helpers/buildBlobPath.js";
import { buildPresignedUploadResponse } from "../../helpers/buildPresignedUploadResponse.js";
import type { StorageAdapter } from "@/services/storage/index.js";

type BadgeRequestUploadInput = RequestBadgeUploadBody &
  RequestBadgeUploadParams;

export const badgeRequestUploadService = async (
  _prisma: PrismaClient,
  storage: StorageAdapter,
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

  return buildPresignedUploadResponse(storage, blobPath, fileUuid);
};
