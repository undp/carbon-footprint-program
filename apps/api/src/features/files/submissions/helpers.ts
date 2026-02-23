import {
  type PrismaClient,
  type Prisma,
  type SubmissionFileType,
} from "@repo/database";
import { FileTypeNotFoundError } from "../shared/errors.js";

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
