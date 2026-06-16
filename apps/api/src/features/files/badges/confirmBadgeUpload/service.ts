import type { PrismaClient } from "@repo/database";
import {
  ConfirmBadgeUploadBody,
  ConfirmBadgeUploadParams,
  type ConfirmBadgeUploadResponse,
} from "@repo/types";
import { FileType } from "@repo/types";
import { persistBadgeFileRecord } from "../helpers.js";
import { buildBlobPath } from "../../helpers/buildBlobPath.js";
import type { StorageAdapter } from "@repo/storage";

type BadgeConfirmUploadInput = ConfirmBadgeUploadBody &
  ConfirmBadgeUploadParams & { userId?: string };

export const badgeConfirmUploadService = async (
  prisma: PrismaClient,
  storage: StorageAdapter,
  input: BadgeConfirmUploadInput
): Promise<ConfirmBadgeUploadResponse> => {
  const { badgeType, uuid, originalName, userId } = input;

  const blobPath = buildBlobPath({
    fileType: FileType.BADGE,
    groupKey: badgeType,
    uuid,
    name: originalName,
  });

  return persistBadgeFileRecord(
    prisma,
    storage,
    { uuid, blobPath, originalName, userId },
    badgeType
  );
};
