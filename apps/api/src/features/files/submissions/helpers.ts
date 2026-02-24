import {
  type PrismaClient,
  type Prisma,
  type SubmissionFileType,
} from "@repo/database";
import { type ContainerClient } from "@azure/storage-blob";
import { type ConfirmUploadResponse } from "@repo/types";
import { FileTypeNotFoundError } from "../errors.js";
import {
  checkFileRecordExists,
  type PersistFileRecordParams,
} from "../helpers/persistFileRecord.js";
import { mapFileToResponse } from "../mappers.js";

export async function persistSubmissionFileRecord(
  prisma: PrismaClient,
  blobStorage: ContainerClient,
  params: PersistFileRecordParams,
  submissionId: string,
  submissionFileType?: SubmissionFileType
): Promise<ConfirmUploadResponse> {
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

export async function createSubmissionFile(
  tx: Prisma.TransactionClient,
  fileId: bigint,
  submissionId: string,
  submissionFileType?: SubmissionFileType
): Promise<void> {
  await tx.submissionFile.create({
    data: {
      fileId,
      submissionId: BigInt(submissionId),
      ...(submissionFileType && { type: submissionFileType }),
    },
  });
}

export async function findSubmissionFileIds(
  prisma: PrismaClient,
  submissionId: string,
  submissionFileType?: SubmissionFileType
): Promise<bigint[]> {
  const links = await prisma.submissionFile.findMany({
    where: {
      submissionId: BigInt(submissionId),
      ...(submissionFileType && { type: submissionFileType }),
    },
    select: { fileId: true },
  });
  return links.map((l) => l.fileId);
}
