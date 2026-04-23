import {
  PrismaClient,
  Submission,
  SubmissionStatus,
  SubmissionSubject,
  OrganizationStatus,
  OrganizationDataStatus,
  SubmissionType,
} from "@repo/database";
import { createTestOrganization } from "./organizationFactory.js";
import { createTestOrganizationData } from "./organizationDataFactory.js";

export type CarbonInventorySubmissionType =
  | typeof SubmissionType.CARBON_INVENTORY_CALCULATION
  | typeof SubmissionType.CARBON_INVENTORY_VERIFICATION
  | typeof SubmissionType.REDUCTION_PROJECT_VERIFICATION
  | typeof SubmissionType.NEUTRALIZATION_PLAN_VERIFICATION;

/**
 * Builds a complete organization → organization data → submission chain with
 * sensible defaults (ACTIVE org, ACTIVE org data, PENDING submission).
 * Use this in tests that need a valid submission without caring about the
 * underlying org structure.
 */
export async function buildOrganizationDataSubmission(
  prisma: PrismaClient,
  userId: bigint
): Promise<Submission> {
  const org = await createTestOrganization(prisma, {
    status: OrganizationStatus.ACTIVE,
  });
  const orgData = await createTestOrganizationData(prisma, org.id, {
    status: OrganizationDataStatus.ACTIVE,
  });
  const { submission } = await createTestOrganizationDataSubmission(
    prisma,
    orgData.id,
    SubmissionStatus.PENDING,
    userId
  );
  return submission;
}

/**
 * Creates a submission subject for organization data
 */
export async function createTestSubmissionSubjectForOrganizationData(
  prisma: PrismaClient,
  organizationDataId: bigint
): Promise<SubmissionSubject> {
  const subject = await prisma.submissionSubject.create({
    data: {},
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
  type: SubmissionType,
  overrides?: Partial<Submission>
): Promise<Submission> {
  return await prisma.submission.create({
    data: {
      subjectId,
      type,
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
  userId: bigint,
  reviewerId?: bigint,
  reviewComments?: string
): Promise<{ subject: SubmissionSubject; submission: Submission }> {
  const subject = await createTestSubmissionSubjectForOrganizationData(
    prisma,
    organizationDataId
  );

  const submission = await createTestSubmission(
    prisma,
    subject.id,
    SubmissionType.ORGANIZATION_ACCREDITATION,
    {
      status,
      reviewerId,
      reviewComments,
      createdById: userId,
    }
  );

  return { subject, submission };
}

/**
 * Creates a submission subject for a carbon inventory
 */
export async function createTestSubmissionSubjectForCarbonInventory(
  prisma: PrismaClient,
  carbonInventoryId: bigint
): Promise<SubmissionSubject> {
  const existing = await prisma.submissionSubjectCarbonInventory.findUnique({
    where: { carbonInventoryId },
    include: { subject: true },
  });

  if (existing) {
    return existing.subject;
  }

  const subject = await prisma.submissionSubject.create({
    data: {},
  });

  await prisma.submissionSubjectCarbonInventory.create({
    data: {
      subjectId: subject.id,
      carbonInventoryId,
    },
  });

  return subject;
}

/**
 * Creates a complete submission flow for a carbon inventory (subject + submission)
 */
export async function createTestCarbonInventorySubmission(
  prisma: PrismaClient,
  carbonInventoryId: bigint,
  type: CarbonInventorySubmissionType = SubmissionType.CARBON_INVENTORY_CALCULATION,
  status: SubmissionStatus = SubmissionStatus.PENDING,
  userId: bigint,
  reviewerId?: bigint,
  reviewComments?: string
): Promise<{ subject: SubmissionSubject; submission: Submission }> {
  const subject = await createTestSubmissionSubjectForCarbonInventory(
    prisma,
    carbonInventoryId
  );

  const submission = await createTestSubmission(prisma, subject.id, type, {
    status,
    reviewerId,
    reviewComments,
    createdById: userId,
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
      updatedById: reviewerId,
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
      updatedById: reviewerId,
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
