import type { PrismaClient } from "@repo/database";
import type { ContainerClient } from "@azure/storage-blob";
import {
  ConfirmBadgeUploadBody,
  ConfirmBadgeUploadParams,
  FileType,
  type ConfirmBadgeUploadResponse,
} from "@repo/types";
import { persistBadgeFileRecord } from "../helpers.js";
import { buildBlobPath } from "../../helpers/buildBlobPath.js";

type BadgeConfirmUploadInput = ConfirmBadgeUploadBody &
  ConfirmBadgeUploadParams;

export const badgeConfirmUploadService = async (
  prisma: PrismaClient,
  blobStorage: ContainerClient,
  input: BadgeConfirmUploadInput,
  userId: string
): Promise<ConfirmBadgeUploadResponse> => {
  const { badgeType, uuid, originalName } = input;

  const blobPath = buildBlobPath({
    fileType: FileType.BADGE,
    groupKey: badgeType,
    uuid,
    name: originalName,
  });

  return persistBadgeFileRecord(
    prisma,
    blobStorage,
    {
      uuid,
      blobPath,
      originalName,
      userId,
    },
    badgeType
  );
};
