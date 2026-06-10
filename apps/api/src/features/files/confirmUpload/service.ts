import { type PrismaClient, Prisma } from "@repo/database";
import type { ContainerClient } from "@azure/storage-blob";
import type { FastifyBaseLogger } from "fastify";
import {
  type ConfirmUploadBody,
  type ConfirmUploadResponse,
} from "@repo/types";
import { getFileUploadLimits } from "@repo/constants";
import { buildBlobPath } from "../helpers/buildBlobPath.js";
import { checkFileRecordExists } from "../helpers/persistFileRecord.js";
import { validateFileUploadDeclaration } from "../helpers/validateFileUploadDeclaration.js";
import { DatabaseUniqueConstraintViolationError } from "@/errors/index.js";

type ConfirmUploadInput = ConfirmUploadBody & { userId?: string };

export const confirmUploadService = async (
  prisma: PrismaClient,
  blobStorage: ContainerClient,
  input: ConfirmUploadInput,
  log?: FastifyBaseLogger
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

  const limits = getFileUploadLimits(fileType);
  try {
    validateFileUploadDeclaration(
      { fileType, originalName, sizeBytes, mimeType },
      limits
    );
  } catch (validationError) {
    // Best-effort cleanup. A storage failure here must not mask the 400
    // validation error the client deserves; any orphan left behind is handled
    // by the future fase-2 sweep.
    try {
      await blobStorage.getBlockBlobClient(blobPath).deleteIfExists();
    } catch (cleanupError) {
      log?.warn(
        { err: cleanupError, blobPath, uuid },
        "Failed to delete orphaned blob after validation failure"
      );
    }
    throw validationError;
  }

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
