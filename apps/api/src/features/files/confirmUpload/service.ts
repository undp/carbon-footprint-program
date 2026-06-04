import { type PrismaClient, Prisma } from "@repo/database";
import {
  type ConfirmUploadBody,
  type ConfirmUploadResponse,
} from "@repo/types";
import { buildBlobPath } from "../helpers/buildBlobPath.js";
import { checkFileRecordExists } from "../helpers/persistFileRecord.js";
import { DatabaseUniqueConstraintViolationError } from "@/errors/index.js";
import type { StorageAdapter } from "@/services/storage/index.js";

type ConfirmUploadInput = ConfirmUploadBody & { userId?: string };

export const confirmUploadService = async (
  prisma: PrismaClient,
  storage: StorageAdapter,
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
    storage,
    blobPath,
    uuid
  );

  try {
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
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new DatabaseUniqueConstraintViolationError();
    }
    throw error;
  }

  return { uuid };
};
