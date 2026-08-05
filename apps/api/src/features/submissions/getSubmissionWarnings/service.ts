import type { PrismaClient } from "@repo/database";
import { SubmissionType } from "@repo/database";
import type { GetSubmissionWarningsResponse } from "@repo/types";
import { ResourceNotFoundError } from "@/errors/index.js";
import {
  getOrganizationIdentityCollisionWarnings,
  ORGANIZATION_IDENTITY_SELECT,
} from "./organizationIdentityCollision.js";

export const getSubmissionWarningsService = async (
  prisma: PrismaClient,
  submissionId: string
): Promise<GetSubmissionWarningsResponse> => {
  const submission = await prisma.submission.findUnique({
    where: { id: BigInt(submissionId) },
    select: {
      type: true,
      status: true,
      subject: {
        select: {
          organizationData: {
            select: {
              organizationData: { select: ORGANIZATION_IDENTITY_SELECT },
            },
          },
        },
      },
    },
  });

  if (!submission) {
    throw new ResourceNotFoundError("Submission", submissionId);
  }

  // Dispatch by submission type. Types with no warning logic return []; the
  // endpoint stays generic so future types can contribute their own kinds.
  switch (submission.type) {
    case SubmissionType.ORGANIZATION_ACCREDITATION: {
      const applicant = submission.subject.organizationData?.organizationData;
      if (!applicant) return [];
      return getOrganizationIdentityCollisionWarnings(
        prisma,
        applicant,
        submission.status
      );
    }
    default:
      return [];
  }
};
