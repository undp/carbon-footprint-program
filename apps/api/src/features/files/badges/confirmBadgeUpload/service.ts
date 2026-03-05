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

// TODO: Once a badge maintainer role is implemented, accept userId and pass it
// to persistBadgeFileRecord so createdById is populated for auditing.
export const badgeConfirmUploadService = async (
  prisma: PrismaClient,
  blobStorage: ContainerClient,
  input: BadgeConfirmUploadInput
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
    },
    badgeType
  );
};
