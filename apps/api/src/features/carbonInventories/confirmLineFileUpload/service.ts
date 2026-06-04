import type { PrismaClient } from "@repo/database";
import { FileType, type ConfirmLineFileUploadResponse } from "@repo/types";
import {
  CARBON_INVENTORY_LINE_FILE_ALLOWED_MIME_TYPES,
  CARBON_INVENTORY_LINE_MAX_FILE_SIZE_BYTES,
} from "@repo/constants";
import { buildBlobPath } from "@/features/files/helpers/buildBlobPath.js";
import { checkFileRecordExists } from "@/features/files/helpers/persistFileRecord.js";
import { LineFileUploadValidationError } from "./errors.js";
import type { StorageAdapter } from "@/services/storage/index.js";

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
  storage: StorageAdapter,
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
    storage,
    blobPath,
    uuid
  );

  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    await storage.deleteObject(blobPath);
    throw new LineFileUploadValidationError(
      `unsupported file type "${mimeType}"`
    );
  }

  if (sizeBytes > CARBON_INVENTORY_LINE_MAX_FILE_SIZE_BYTES) {
    await storage.deleteObject(blobPath);
    throw new LineFileUploadValidationError(
      `file size ${sizeBytes} bytes exceeds maximum allowed ${CARBON_INVENTORY_LINE_MAX_FILE_SIZE_BYTES} bytes`
    );
  }

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
      sizeBytes: true,
    },
  });

  return {
    id: created.id.toString(),
    uuid: created.uuid,
    originalName: created.originalName,
    sizeBytes: created.sizeBytes,
  };
};
