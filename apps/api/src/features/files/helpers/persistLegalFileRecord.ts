import { type PrismaClient, Prisma } from "@repo/database";
import type { ContainerClient } from "@azure/storage-blob";
import {
  type ConfirmLegalUploadResponse,
  FileStatus,
  FileType,
  SystemParameterKeyEnum,
} from "@repo/types";
import { checkFileRecordExists } from "./persistFileRecord.js";
import { DatabaseUniqueConstraintViolationError } from "@/errors/index.js";

export interface PersistLegalFileRecordParams {
  uuid: string;
  blobPath: string;
  originalName: string;
  userId?: string;
}

export async function persistLegalFileRecord(
  prisma: PrismaClient,
  blobStorage: ContainerClient,
  params: PersistLegalFileRecordParams
): Promise<ConfirmLegalUploadResponse> {
  const { sizeBytes, mimeType } = await checkFileRecordExists(
    blobStorage,
    params.blobPath,
    params.uuid
  );

  try {
    await prisma.$transaction(async (tx) => {
      await tx.file.updateMany({
        where: {
          blobPath: { startsWith: `${FileType.LEGAL}/terms-conditions/` },
          status: FileStatus.ACTIVE,
        },
        data: {
          status: FileStatus.DELETED,
          deletedAt: new Date(),
        },
      });

      await tx.file.create({
        data: {
          uuid: params.uuid,
          originalName: params.originalName,
          mimeType,
          sizeBytes,
          blobPath: params.blobPath,
          createdById: params.userId ? BigInt(params.userId) : null,
        },
      });

      await tx.systemParameter.update({
        where: { key: SystemParameterKeyEnum.TERMS_CONDITIONS_FILE_UUID },
        data: {
          value: params.uuid,
          updatedById: params.userId ? BigInt(params.userId) : null,
        },
      });
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

  return { uuid: params.uuid };
}
