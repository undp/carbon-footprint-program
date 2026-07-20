import type { PrismaClient } from "@repo/database";
import {
  SubmissionStatus,
  SubmissionType,
  BadgeStatus,
  SubmissionFileType,
} from "@repo/database";
import type {
  ApproveRequestBody,
  ApproveRequestResponse,
  User,
} from "@repo/types";
import { assertLegalNameAvailableForAccreditation } from "@/features/organizations/helpers.js";
import { OrganizationAccreditationDataMissingError } from "@/features/organizations/errors.js";
import { SubmissionUpdateError } from "../../errors.js";
import {
  attachFilesToSubmission,
  updatePendingSubmissionStatus,
} from "../helpers.js";

export const approveRequestService = async (
  prismaClient: PrismaClient,
  submissionId: string,
  body: ApproveRequestBody,
  userId: User["id"]
): Promise<ApproveRequestResponse> => {
  await prismaClient.$transaction(async (tx) => {
    const submissionIdBigInt = BigInt(submissionId);

    // 1. Get the submission to verify it's PENDING and get its type + (for
    // organization accreditation) the accredited data needed to enforce the
    // unique-legal-name rule.
    const submission = await tx.submission.findUnique({
      where: { id: submissionIdBigInt },
      select: {
        status: true,
        type: true,
        subject: {
          select: {
            organizationData: {
              select: {
                organizationData: {
                  select: {
                    legalName: true,
                    organizationId: true,
                    organization: { select: { countryId: true } },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!submission || submission.status !== SubmissionStatus.PENDING) {
      throw new SubmissionUpdateError(submissionId);
    }

    // For organization accreditations, reject approval if another organization
    // already reserves the same (country, razón social). The subject→
    // organizationData link is nullable and the submission type is not
    // DB-constrained to the subject subtype, so guard the missing link instead
    // of non-null-asserting it.
    if (submission.type === SubmissionType.ORGANIZATION_ACCREDITATION) {
      const accreditedData =
        submission.subject.organizationData?.organizationData;

      if (!accreditedData) {
        throw new OrganizationAccreditationDataMissingError(submissionId);
      }

      await assertLegalNameAvailableForAccreditation(tx, {
        organizationId: accreditedData.organizationId,
        countryId: accreditedData.organization.countryId,
        legalName: accreditedData.legalName,
      });
    }

    // 2. Find the active badge for the submission type
    // BadgeType matches SubmissionType, so we can use the same value
    const activeBadge = await tx.badge.findFirst({
      where: {
        type: submission.type,
        status: BadgeStatus.ACTIVE,
      },
      select: { id: true },
    });

    // 3. Update submission with status and badgeId
    await updatePendingSubmissionStatus(
      tx,
      submissionId,
      SubmissionStatus.APPROVED,
      userId,
      {
        reviewComments: body.reviewComments,
        badgeId: activeBadge?.id,
      }
    );

    if (body.reviewFileUuids?.length || body.recognitionFileUuids?.length) {
      await attachFilesToSubmission(tx, submissionIdBigInt, [
        {
          uuids: body.reviewFileUuids,
          type: SubmissionFileType.REVIEW_ATTACHMENT,
        },
        {
          uuids: body.recognitionFileUuids,
          type: SubmissionFileType.RECOGNITION,
        },
      ]);
    }
  });

  return {};
};
