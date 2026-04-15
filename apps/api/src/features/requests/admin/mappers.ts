import type { Prisma } from "@repo/database";
import type { GetAllAdminRequestsResponse } from "@repo/types";

export type SubmissionSummaryViewRow =
  Prisma.SubmissionSummaryViewGetPayload<object>;

export const mapAdminSubmissionSummaryToResponse = (
  submission: SubmissionSummaryViewRow
): GetAllAdminRequestsResponse[number] => ({
  id: submission.submissionId.toString(),
  organizationId: submission.organizationId.toString(),
  organizationName: submission.organizationName ?? "",
  carbonInventoryId: submission.carbonInventoryId?.toString() ?? null,
  reductionProjectId: submission.reductionProjectId?.toString() ?? null,
  type: submission.type,
  year: submission.period,
  status: submission.status,
  requestedAt: submission.requestedAt.toISOString(),
});
