import type { Prisma, PrismaClient } from "@repo/database";
import { SubmissionStatus, SubmissionType } from "@repo/database";
import type { GetAllAdminRequestsResponse, User } from "@repo/types";
import {
  SystemParameterKeyEnum,
  MeasurementRecognitionBehaviorEnum,
} from "@repo/types";
import { groupBy, maxBy } from "lodash-es";
import { getSystemParameterValue } from "@/helpers/getSystemParameterValue.js";
import { mapAdminSubmissionSummaryToResponse } from "../mappers.js";

export const getAllRequestsService = async (
  prismaClient: PrismaClient,
  _query: null,
  _user: User | null
): Promise<GetAllAdminRequestsResponse> => {
  const recognitionBehavior = await getSystemParameterValue(
    prismaClient,
    SystemParameterKeyEnum.CARBON_INVENTORIES_MEASUREMENT_RECOGNITION_BEHAVIOR
  );

  const where: Prisma.SubmissionSummaryViewWhereInput =
    recognitionBehavior === MeasurementRecognitionBehaviorEnum.HIDDEN
      ? { type: { not: SubmissionType.CARBON_INVENTORY_CALCULATION } }
      : recognitionBehavior === MeasurementRecognitionBehaviorEnum.AUTOMATIC
        ? { status: { not: SubmissionStatus.APPROVED_AUTOMATICALLY } }
        : {};

  const submissions = await prismaClient.submissionSummaryView.findMany({
    where,
    orderBy: [{ requestedAt: "desc" }, { submissionId: "desc" }],
  });

  const getGroupKey = (row: (typeof submissions)[number]): string =>
    row.carbonInventoryId !== null
      ? `ci:${row.carbonInventoryId}`
      : row.reductionProjectId !== null
        ? `rp:${row.reductionProjectId}`
        : `org:${row.organizationId}`;

  const grouped = groupBy(submissions, getGroupKey);

  const result = Object.values(grouped)
    .map((group) => maxBy(group, (s) => s.requestedAt)!)
    .sort((a, b) => b.requestedAt.getTime() - a.requestedAt.getTime());

  return result.map(mapAdminSubmissionSummaryToResponse);
};
