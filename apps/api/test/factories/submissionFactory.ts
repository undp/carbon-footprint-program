import {
  PrismaClient,
  Submission,
  SubmissionStatus,
  SubmissionSubject,
  SubmissionSubjectType,
  OrganizationStatus,
  OrganizationDataStatus,
} from "@repo/database";
import { createTestOrganization } from "./organizationFactory.js";
import { createTestOrganizationData } from "./organizationDataFactory.js";

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
  const subject = await prisma.submissionSubject.create({
    data: {
      subjectType: SubmissionSubjectType.ORGANIZATION_ACCREDITATION,
      organizationData: {
        create: {
          organizationDataId: organizationDataId,
        },
      },
      submission: {
        create: {
          status: status,
          reviewerId: reviewerId,
          reviewComments: reviewComments,
          createdById: userId,
          updatedById: userId,
        },
      },
    },
    include: {
      submission: true,
    },
  });

  return { subject, submission: subject.submission! };
}

export async function createTestCarbonInventoryCalculationSubmission(
  prisma: PrismaClient,
  carbonInventoryId: bigint,
  status: SubmissionStatus = SubmissionStatus.PENDING,
  userId: bigint,
  reviewerId?: bigint,
  reviewComments?: string
): Promise<{ subject: SubmissionSubject; submission: Submission }> {
  const subject = await prisma.submissionSubject.create({
    data: {
      subjectType: SubmissionSubjectType.CARBON_INVENTORY_CALCULATION,
      calculatedInventory: {
        create: {
          carbonInventoryId: carbonInventoryId,
        },
      },
      submission: {
        create: {
          status: status,
          reviewerId: reviewerId,
          reviewComments: reviewComments,
          createdById: userId,
          updatedById: userId,
        },
      },
    },
    include: {
      submission: true,
    },
  });

  return { subject, submission: subject.submission! };
}

export async function createTestCarbonInventoryVerificationSubmission(
  prisma: PrismaClient,
  carbonInventoryId: bigint,
  status: SubmissionStatus = SubmissionStatus.PENDING,
  userId: bigint,
  reviewerId?: bigint,
  reviewComments?: string
): Promise<{ subject: SubmissionSubject; submission: Submission }> {
  const subject = await prisma.submissionSubject.create({
    data: {
      subjectType: SubmissionSubjectType.CARBON_INVENTORY_VERIFICATION,
      verifiedInventory: {
        create: {
          carbonInventoryId: carbonInventoryId,
        },
      },
      submission: {
        create: {
          status: status,
          reviewerId: reviewerId,
          reviewComments: reviewComments,
          createdById: userId,
          updatedById: userId,
        },
      },
    },
    include: {
      submission: true,
    },
  });

  return { subject, submission: subject.submission! };
}

/**
 * Cleans up submission-related test data
 */
export async function cleanupTestSubmissions(
  prisma: PrismaClient
): Promise<void> {
  await prisma.submission.deleteMany();
  await prisma.submissionSubjectOrganizationData.deleteMany();
  await prisma.submissionSubjectCalculatedInventory.deleteMany();
  await prisma.submissionSubjectVerifiedInventory.deleteMany();
  await prisma.submissionSubject.deleteMany();
}
