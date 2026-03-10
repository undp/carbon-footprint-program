import { type PrismaClient } from "@repo/database";
import { SubmissionNotFoundError } from "../errors.js";

export async function validateSubmissionExists(
  prisma: PrismaClient,
  submissionId: string
): Promise<void> {
  const submission = await prisma.submission.findUnique({
    where: { id: BigInt(submissionId) },
    select: { id: true },
  });
  if (!submission) throw new SubmissionNotFoundError(submissionId);
}
