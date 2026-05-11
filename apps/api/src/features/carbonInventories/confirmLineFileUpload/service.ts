import type { PrismaClient } from "@repo/database";
import type { ContainerClient } from "@azure/storage-blob";
import { FileType, type ConfirmLineFileUploadResponse } from "@repo/types";
import {
  CARBON_INVENTORY_LINE_FILE_ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE_BYTES,
} from "@repo/constants";
import { buildBlobPath } from "@/features/files/helpers/buildBlobPath.js";
import { checkFileRecordExists } from "@/features/files/helpers/persistFileRecord.js";
import { LineFileUploadValidationError } from "./errors.js";

interface ConfirmLineFileUploadInput {
  carbonInventoryId: string;
  uuid: string;
  originalName: string;
  userId?: string;
}

const ALLOWED_MIME_TYPES = new Set<string>(
  CARBON_INVENTORY_LINE_FILE_ALLOWED_MIME_TYPES
);

export const confirmLineFileUploadService = async (
  prisma: PrismaClient,
  blobStorage: ContainerClient,
  input: ConfirmLineFileUploadInput
): Promise<ConfirmLineFileUploadResponse> => {
  const { carbonInventoryId, uuid, originalName, userId } = input;

  const blobPath = buildBlobPath({
    fileType: FileType.CARBON_INVENTORY,
    groupKey: carbonInventoryId,
    subPath: "LINES",
    uuid,
    name: originalName,
  });

  const { sizeBytes, mimeType } = await checkFileRecordExists(
    blobStorage,
    blobPath,
    uuid
  );

  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    await blobStorage.getBlockBlobClient(blobPath).deleteIfExists();
    throw new LineFileUploadValidationError(
      `unsupported file type "${mimeType}"`
    );
  }

  if (sizeBytes > MAX_FILE_SIZE_BYTES) {
    await blobStorage.getBlockBlobClient(blobPath).deleteIfExists();
    throw new LineFileUploadValidationError(
      `file size ${sizeBytes} bytes exceeds maximum allowed ${MAX_FILE_SIZE_BYTES} bytes`
    );
  }

  // P2002 (unique constraint) bubbles up to the global error handler,
  // which normalizes it to 409 DATABASE_UNIQUE_CONSTRAINT — no try/catch
  // needed here.
  const created = await prisma.file.create({
    data: {
      uuid,
      originalName,
      mimeType,
      sizeBytes,
      blobPath,
      createdById: userId ? BigInt(userId) : null,
    },
    select: {
      id: true,
      uuid: true,
      originalName: true,
      mimeType: true,
      sizeBytes: true,
      createdAt: true,
    },
  });

  return {
    id: created.id.toString(),
    uuid: created.uuid,
    originalName: created.originalName,
    mimeType: created.mimeType,
    sizeBytes: created.sizeBytes,
    createdAt: created.createdAt.toISOString(),
  };
};
