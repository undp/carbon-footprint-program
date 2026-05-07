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
import {
  LEGAL_TERMS_CONDITIONS_ALLOWED_MIME_TYPE,
  LEGAL_TERMS_CONDITIONS_GROUP_KEY,
} from "@/features/files/legal/constants.js";
import { LegalUploadValidationError } from "@/features/files/legal/errors.js";

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

  // Reject anything that is not a PDF before promoting the blob to the
  // current Terms & Conditions. Without this check the public stream
  // endpoint could end up serving images, archives, or arbitrary uploads
  // disguised as legal documents. The blob is also removed from storage so
  // invalid uploads do not accumulate.
  if (mimeType !== LEGAL_TERMS_CONDITIONS_ALLOWED_MIME_TYPE) {
    await blobStorage.getBlockBlobClient(params.blobPath).deleteIfExists();
    throw new LegalUploadValidationError(
      `unsupported file type "${mimeType}". Allowed: ${LEGAL_TERMS_CONDITIONS_ALLOWED_MIME_TYPE}`
    );
  }

  try {
    // Serializable isolation guarantees that two concurrent confirms cannot
    // both observe the same set of ACTIVE legal files, both soft-delete it,
    // and both insert their own ACTIVE row — which under the default
    // READ_COMMITTED level would leave multiple ACTIVE T&C files in the DB
    // even though SystemParameter only points at one. Mirrors the pattern
    // used in activateBadgeService for the same single-current invariant.
    await prisma.$transaction(
      async (tx) => {
        await tx.file.updateMany({
          where: {
            blobPath: {
              startsWith: `${FileType.LEGAL}/${LEGAL_TERMS_CONDITIONS_GROUP_KEY}/`,
            },
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
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );
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
