import {
  PrismaClient,
  Submission,
  SubmissionStatus,
  SubmissionSubject,
  SubmissionSubjectType,
} from "@repo/database";

/**
 * Creates a submission subject for organization data
 */
export async function createTestSubmissionSubjectForOrganizationData(
  prisma: PrismaClient,
  organizationDataId: bigint
): Promise<SubmissionSubject> {
  const subject = await prisma.submissionSubject.create({
    data: {
      subjectType: SubmissionSubjectType.ORGANIZATION_DATA,
    },
  });

  await prisma.submissionSubjectOrganizationData.create({
    data: {
      subjectId: subject.id,
      organizationDataId: organizationDataId,
    },
  });

  return subject;
}

/**
 * Creates a submission for a subject
 */
export async function createTestSubmission(
  prisma: PrismaClient,
  subjectId: bigint,
  overrides?: Partial<Submission>
): Promise<Submission> {
  return await prisma.submission.create({
    data: {
      subjectId,
      status: SubmissionStatus.PENDING,
      updatedAt: null,
      ...overrides,
    },
  });
}

/**
 * Creates a complete submission flow for organization data (subject + submission)
 */
export async function createTestOrganizationDataSubmission(
  prisma: PrismaClient,
  organizationDataId: bigint,
  status: SubmissionStatus = SubmissionStatus.PENDING,
  reviewerId?: bigint,
  reviewComments?: string
): Promise<{ subject: SubmissionSubject; submission: Submission }> {
  const subject = await createTestSubmissionSubjectForOrganizationData(
    prisma,
    organizationDataId
  );

  const submission = await createTestSubmission(prisma, subject.id, {
    status,
    reviewerId,
    reviewComments,
  });

  return { subject, submission };
}

/**
 * Approves a pending submission
 */
export async function approveSubmission(
  prisma: PrismaClient,
  submissionId: bigint,
  reviewerId: bigint,
  reviewComments?: string
): Promise<Submission> {
  return await prisma.submission.update({
    where: { id: submissionId },
    data: {
      status: SubmissionStatus.APPROVED,
      reviewerId,
      reviewComments,
    },
  });
}

/**
 * Rejects a pending submission.
 * NOTE: Does NOT mark organization data as OUTDATED - that happens when user creates new edition.
 */
export async function rejectSubmission(
  prisma: PrismaClient,
  submissionId: bigint,
  reviewerId: bigint,
  reviewComments: string
): Promise<Submission> {
  return await prisma.submission.update({
    where: { id: submissionId },
    data: {
      status: SubmissionStatus.REJECTED,
      reviewerId,
      reviewComments,
    },
  });
}

/**
 * Cleans up submission-related test data
 */
export async function cleanupTestSubmissions(
  prisma: PrismaClient
): Promise<void> {
  await prisma.submission.deleteMany();
  await prisma.submissionSubjectOrganizationData.deleteMany();
  await prisma.submissionSubjectCarbonInventory.deleteMany();
  await prisma.submissionSubject.deleteMany();
}
