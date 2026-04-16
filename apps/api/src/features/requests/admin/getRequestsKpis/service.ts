import type { PrismaClient } from "@repo/database";
import { SubmissionType, SubmissionStatus } from "@repo/database";
import type { GetAdminRequestsKpisResponse } from "@repo/types";
import { flatMap, sumBy } from "lodash-es";

export const getRequestsKpisService = async (
  prismaClient: PrismaClient,
  year?: number
): Promise<GetAdminRequestsKpisResponse> => {
  const types = Object.values(SubmissionType);
  // All statuses including APPROVED_AUTOMATICALLY
  const statuses = Object.values(SubmissionStatus);

  const bucket = new Map<string, number>();

  if (!year) {
    // Original behaviour: no year filter, use the summary view
    const submissionCounts = await prismaClient.submissionSummaryView.groupBy({
      by: ["type", "status"],
      _count: true,
    });

    for (const sub of submissionCounts) {
      const key = `${sub.type}:${sub.status}`;
      bucket.set(key, sub._count);
    }
  } else {
    // Year filter: split by whether the submission is linked to a carbon inventory
    const inventoryLinkedTypes = [
      SubmissionType.CARBON_INVENTORY_CALCULATION,
      SubmissionType.CARBON_INVENTORY_VERIFICATION,
      SubmissionType.REDUCTION_PLAN_VERIFICATION,
      SubmissionType.NEUTRALIZATION_PLAN_VERIFICATION,
    ];

    const orgAccreditationType = SubmissionType.ORGANIZATION_ACCREDITATION;

    // Query inventory-linked submissions filtered by CarbonInventory.year
    const inventorySubmissions = await prismaClient.submission.groupBy({
      by: ["type", "status"],
      where: {
        type: { in: inventoryLinkedTypes },
        subject: {
          carbonInventory: {
            carbonInventory: {
              year,
              status: "ACTIVE",
            },
          },
        },
      },
      _count: true,
    });

    for (const sub of inventorySubmissions) {
      const key = `${sub.type}:${sub.status}`;
      bucket.set(key, sub._count);
    }

    // Query ORGANIZATION_ACCREDITATION submissions filtered by year(reviewedAt)
    const orgAccreditationSubmissions = await prismaClient.submission.groupBy({
      by: ["type", "status"],
      where: {
        type: orgAccreditationType,
        reviewedAt: {
          gte: new Date(`${year}-01-01T00:00:00.000Z`),
          lt: new Date(`${year + 1}-01-01T00:00:00.000Z`),
        },
      },
      _count: true,
    });

    for (const sub of orgAccreditationSubmissions) {
      const key = `${sub.type}:${sub.status}`;
      bucket.set(key, sub._count);
    }
  }

  const counts = flatMap(types, (type) =>
    statuses.map((status) => {
      const key = `${type}:${status}`;
      return {
        type,
        status,
        value: bucket.get(key) ?? 0,
      };
    })
  );

  return {
    total: sumBy(counts, "value"),
    counts,
  };
};
