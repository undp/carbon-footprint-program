import type { PrismaClient, Prisma, SubmissionFileType } from "@repo/database";
import type { FileType } from "@repo/types";
import { FileTypeNotFoundError } from "./errors.js";

export async function validateFileTypeExists(
  prisma: PrismaClient,
  _fileType: FileType,
  ownerId: bigint
): Promise<void> {
  const submission = await prisma.submission.findUnique({
    where: { id: ownerId },
    select: { id: true },
  });
  if (!submission)
    throw new FileTypeNotFoundError("Submission", ownerId.toString());
}

export async function createFileLink(
  tx: Prisma.TransactionClient,
  _fileType: FileType,
  fileId: bigint,
  ownerId: bigint,
  submissionFileType?: SubmissionFileType
): Promise<void> {
  await tx.submissionFile.create({
    data: {
      fileId,
      submissionId: ownerId,
      ...(submissionFileType && { type: submissionFileType }),
    },
  });
}

export async function findFileIdsByType(
  prisma: PrismaClient,
  _fileType: FileType,
  ownerId: bigint,
  submissionFileType?: SubmissionFileType
): Promise<bigint[]> {
  const links = await prisma.submissionFile.findMany({
    where: {
      submissionId: ownerId,
      ...(submissionFileType && { type: submissionFileType }),
    },
    select: { fileId: true },
  });
  return links.map((l) => l.fileId);
}
