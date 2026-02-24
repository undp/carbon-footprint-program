import type { PrismaClient } from "@repo/database";
import type { ContainerClient } from "@azure/storage-blob";
import {
  ConfirmBadgeUploadBody,
  ConfirmBadgeUploadParams,
  FileType,
  type ConfirmBadgeUploadResponse,
} from "@repo/types";
import { validateBadgeType, createBadgeEntry } from "../helpers.js";
import { buildBlobPath } from "../../shared/buildBlobPath.js";
import { persistFileRecord } from "../../shared/persistFileRecord.js";

type BadgeConfirmUploadInput = ConfirmBadgeUploadBody &
  ConfirmBadgeUploadParams & { userId: string };

export const badgeConfirmUploadService = async (
  prisma: PrismaClient,
  blobStorage: ContainerClient,
  input: BadgeConfirmUploadInput
): Promise<ConfirmBadgeUploadResponse> => {
  const { badgeType, uuid, originalName, userId } = input;

  validateBadgeType(badgeType);

  const blobPath = buildBlobPath({
    fileType: FileType.BADGE,
    ownerId: badgeType,
    uuid,
    name: originalName,
  });

  return persistFileRecord(
    prisma,
    blobStorage,
    { uuid, blobPath, originalName, userId },
    (tx, fileId) => createBadgeEntry(tx, fileId, badgeType)
  );
};
