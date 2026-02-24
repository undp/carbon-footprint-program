import { type PrismaClient, type SubmissionFileType } from "@repo/database";
import type { ContainerClient } from "@azure/storage-blob";
import type { ConfirmSubmissionUploadResponse } from "@repo/types";
import {
  checkFileRecordExists,
  type PersistFileRecordParams,
} from "../helpers/persistFileRecord.js";
import { FileTypeNotFoundError } from "../errors.js";
import { mapFileToResponse } from "../mappers.js";

export async function validateSubmissionExists(
  prisma: PrismaClient,
  submissionId: string
): Promise<void> {
  const submission = await prisma.submission.findUnique({
    where: { id: BigInt(submissionId) },
    select: { id: true },
  });
  if (!submission) throw new FileTypeNotFoundError("Submission", submissionId);
}

export async function persistSubmissionFileRecord(
  prisma: PrismaClient,
  blobStorage: ContainerClient,
  params: PersistFileRecordParams,
  submissionId: string,
  submissionFileType?: SubmissionFileType
): Promise<ConfirmSubmissionUploadResponse> {
  const { sizeBytes, mimeType } = await checkFileRecordExists(
    blobStorage,
    params.blobPath,
    params.uuid
  );

  const file = await prisma.file.create({
    data: {
      uuid: params.uuid,
      originalName: params.originalName,
      mimeType,
      sizeBytes,
      blobPath: params.blobPath,
      createdById: BigInt(params.userId),
      submissionFiles: {
        create: {
          submissionId: BigInt(submissionId),
          ...(submissionFileType && { type: submissionFileType }),
        },
      },
    },
  });

  return mapFileToResponse(file);
}
