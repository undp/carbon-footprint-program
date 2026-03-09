import type { PrismaClient } from "@repo/database";
import type { ContainerClient } from "@azure/storage-blob";
import {
  type ConfirmUploadBody,
  type ConfirmUploadResponse,
} from "@repo/types";
import { buildBlobPath } from "../helpers/buildBlobPath.js";
import { checkFileRecordExists } from "../helpers/persistFileRecord.js";

type ConfirmUploadInput = ConfirmUploadBody & { userId?: string };

export const confirmUploadService = async (
  prisma: PrismaClient,
  blobStorage: ContainerClient,
  input: ConfirmUploadInput
): Promise<ConfirmUploadResponse> => {
  const { uuid, originalName, fileType, userId } = input;

  const blobPath = buildBlobPath({
    fileType,
    groupKey: "tmp",
    uuid,
    name: originalName,
  });

  const { sizeBytes, mimeType } = await checkFileRecordExists(
    blobStorage,
    blobPath,
    uuid
  );

  await prisma.file.create({
    data: {
      uuid,
      originalName,
      mimeType,
      sizeBytes,
      blobPath,
      createdById: userId ? BigInt(userId) : null,
    },
  });

  return { uuid };
};
