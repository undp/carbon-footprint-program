import type { PrismaClient } from "@repo/database";
import type {
  RequestOrganizationAccreditationResponse,
  User,
} from "@repo/types";
import {
  MembershipStatus,
  OrganizationDataStatus,
  SubmissionStatus,
  SubmissionSubjectType,
} from "@repo/database";
import {
  OrganizationAccessDeniedError,
  OrganizationDataNotFoundError,
  OrganizationNotFoundError,
  SubmissionAlreadyExistsError,
} from "../../errors.js";

export const requestOrganizationAccreditationService = async (
  prismaClient: PrismaClient,
  organizationId: string,
  user: User | null
): Promise<RequestOrganizationAccreditationResponse> => {
  const userId = user!.id;
  const organization = await prismaClient.organization.findUnique({
    where: {
      id: BigInt(organizationId),
    },
  });

  if (!organization) {
    throw new OrganizationNotFoundError(organizationId);
  }
  // Verify user has ACTIVE membership
  const membership = await prismaClient.userOrganizationMembership.findFirst({
    where: {
      userId: BigInt(userId),
      organizationId: BigInt(organizationId),
      status: MembershipStatus.ACTIVE,
    },
  });

  if (!membership) {
    throw new OrganizationAccessDeniedError(organizationId);
  }

  return await prismaClient.$transaction(async (tx) => {
    // Find ACTIVE organization data that is a Draft (no submission linked)
    const activeData = await tx.organizationData.findFirst({
      where: {
        organizationId: BigInt(organizationId),
        status: OrganizationDataStatus.ACTIVE,
        submission: null,
      },
    });

    if (!activeData) {
      throw new OrganizationDataNotFoundError(organizationId);
    }

    // Check if submission already exists for this org data (safety guard)
    const hasSubmission = await tx.submission.findFirst({
      where: {
        subject: {
          organizationData: { organizationDataId: activeData.id },
        },
      },
      select: { id: true },
    });

    if (hasSubmission) {
      throw new SubmissionAlreadyExistsError(organizationId);
    }

    // Mark any rejected ACTIVE data as OUTDATED (atomically with the submission)
    await tx.organizationData.updateMany({
      where: {
        organizationId: BigInt(organizationId),
        status: OrganizationDataStatus.ACTIVE,
        submission: {
          subject: {
            submissions: {
              some: { status: SubmissionStatus.REJECTED },
            },
          },
        },
      },
      data: { status: OrganizationDataStatus.OUTDATED },
    });

    // Create submission chain (Subject → Link → Submission)
    // 1. Create submission subject
    const subject = await tx.submissionSubject.create({
      data: {
        subjectType: SubmissionSubjectType.ORGANIZATION_DATA,
        createdById: BigInt(userId),
      },
    });

    // 2. Link subject to organization data
    await tx.submissionSubjectOrganizationData.create({
      data: {
        subjectId: subject.id,
        organizationDataId: activeData.id,
      },
    });

    // 3. Create submission
    await tx.submission.create({
      data: {
        subjectId: subject.id,
        status: SubmissionStatus.PENDING,
        createdById: BigInt(userId),
        updatedById: BigInt(userId),
      },
    });

    return {};
  });
};
