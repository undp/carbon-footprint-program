import {
  OrganizationDataStatus,
  PrismaClient,
  SubmissionStatus,
  SubmissionSubjectType,
} from "@repo/database";
import type { SubmitAccreditationRequestResponse } from "@repo/types";
import {
  OrganizationDataNotFoundError,
  OrganizationNotFoundError,
  SubmissionAlreadyExistsError,
} from "../errors.js";

export const submitAccreditationRequestService = async (
  prisma: PrismaClient,
  organizationId: string
): Promise<SubmitAccreditationRequestResponse> => {
  const orgId = BigInt(organizationId);

  return await prisma.$transaction(async (tx) => {
    // 1. Find organization by :id param
    const organization = await tx.organization.findUnique({
      where: { id: orgId },
    });

    if (!organization) {
      throw new OrganizationNotFoundError(organizationId);
    }

    // 2. Find organization_data in DRAFT status for this organization
    const organizationData = await tx.organizationData.findFirst({
      where: {
        organizationId: orgId,
        status: OrganizationDataStatus.DRAFT,
      },
      include: {
        submission: {
          include: {
            subject: {
              include: {
                submissions: {
                  where: {
                    status: {
                      in: [SubmissionStatus.PENDING, SubmissionStatus.APPROVED],
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!organizationData) {
      throw new OrganizationDataNotFoundError(organizationId);
    }

    // 3. Check for existing active submission
    if (
      organizationData.submission?.subject.submissions &&
      organizationData.submission.subject.submissions.length > 0
    ) {
      throw new SubmissionAlreadyExistsError(organizationData.id.toString());
    }

    // 4. Find or create SubmissionSubjectOrganizationData
    let subjectId: bigint;

    if (organizationData.submission) {
      // Reuse existing SubmissionSubject (e.g. from a previous REJECTED submission)
      subjectId = organizationData.submission.subjectId;
    } else {
      // Create new SubmissionSubject and link it
      const newSubject = await tx.submissionSubject.create({
        data: {
          subjectType: SubmissionSubjectType.ORGANIZATION_DATA,
          organizationData: {
            create: {
              organizationDataId: organizationData.id,
            },
          },
        },
      });
      subjectId = newSubject.id;
    }

    // 5. Create Submission with status: PENDING
    const submission = await tx.submission.create({
      data: {
        subjectId,
        status: SubmissionStatus.PENDING,
      },
    });

    // 6. Update organization_data status to SUBMITTED
    await tx.organizationData.update({
      where: { id: organizationData.id },
      data: { status: OrganizationDataStatus.SUBMITTED },
    });

    // 7. Return the submission id and status
    return {
      id: submission.id.toString(),
      status: submission.status,
    };
  });
};
