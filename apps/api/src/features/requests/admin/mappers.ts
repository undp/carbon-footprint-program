import type { Prisma } from "@repo/database";
import type { GetAllAdminRequestsResponse } from "@repo/types";

export const adminSubmissionSummaryViewSelect = {
  submissionId: true,
  subjectType: true,
  status: true,
  organizationName: true,
  period: true,
  requestedAt: true,
} satisfies Prisma.SubmissionSummaryViewSelect;

export type SubmissionSummaryViewRow = Prisma.SubmissionSummaryViewGetPayload<{
  select: typeof adminSubmissionSummaryViewSelect;
}>;

export const mapAdminSubmissionSummaryToResponse = (
  submission: SubmissionSummaryViewRow
): GetAllAdminRequestsResponse[number] => ({
  id: submission.submissionId.toString(),
  organizationName: submission.organizationName,
  type: submission.subjectType,
  year: submission.period,
  status: submission.status,
  requestedAt: submission.requestedAt.toISOString(),
});
