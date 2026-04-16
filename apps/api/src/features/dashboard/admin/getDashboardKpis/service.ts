import type { PrismaClient } from "@repo/database";
import {
  InventoryStatus,
  SubmissionType,
  SubmissionStatus,
} from "@repo/database";
import {
  type GetAdminDashboardKpisResponse,
  RECOGNITION_SUBMISSION_TYPES,
} from "@repo/types";
import { MEASURING_ORGANIZATIONS_YEAR_RANGE } from "@/config/constants.js";

export const getDashboardKpisService = async (
  prismaClient: PrismaClient,
  year?: number
): Promise<GetAdminDashboardKpisResponse> => {
  const [
    { totalOrganizations, measuringOrganizations },
    emissionsData,
    { earned: recognitionsEarned, underReview: recognitionsUnderReview },
  ] = await Promise.all([
    getOrganizationKpis(prismaClient, year),
    getEmissionsData(prismaClient, year),
    getRecognitionCounts(prismaClient, year),
  ]);

  return {
    totalOrganizations,
    measuringOrganizations,
    totalEmissions: emissionsData.totalEmissions,
    verifiedEmissions: emissionsData.verifiedEmissions,
    recognitionsEarned,
    recognitionsUnderReview,
  };
};

async function getOrganizationKpis(
  prismaClient: PrismaClient,
  year?: number
): Promise<{ totalOrganizations: number; measuringOrganizations: number }> {
  const currentYear = new Date().getFullYear();
  const approvedAtFilter = year
    ? { lt: new Date(`${year + 1}-01-01T00:00:00.000Z`) }
    : undefined;

  const inventoryYearFilter: { equals: number } | { gte: number; lte: number } =
    year
      ? { equals: year }
      : {
          gte: currentYear - (MEASURING_ORGANIZATIONS_YEAR_RANGE - 1),
          lte: currentYear,
        };

  const orgs = await prismaClient.organization.findMany({
    where: {
      data: {
        some: {
          submission: {
            subject: {
              submissions: {
                some: {
                  type: SubmissionType.ORGANIZATION_ACCREDITATION,
                  status: {
                    in: [
                      SubmissionStatus.APPROVED,
                      SubmissionStatus.APPROVED_AUTOMATICALLY,
                    ],
                  },
                  ...(approvedAtFilter ? { reviewedAt: approvedAtFilter } : {}),
                },
              },
            },
          },
        },
      },
    },
    select: {
      id: true,
      carbonInventories: {
        where: {
          status: InventoryStatus.ACTIVE,
          isSelfDeclared: true,
          year: inventoryYearFilter,
        },
        select: { id: true },
        take: 1,
      },
    },
  });

  return {
    totalOrganizations: orgs.length,
    measuringOrganizations: orgs.filter((o) => o.carbonInventories.length > 0)
      .length,
  };
}

async function getEmissionsData(
  prismaClient: PrismaClient,
  year?: number
): Promise<{ totalEmissions: number; verifiedEmissions: number }> {
  const inventories = await prismaClient.carbonInventory.findMany({
    where: {
      status: InventoryStatus.ACTIVE,
      isSelfDeclared: true,
      ...(year ? { year } : {}),
    },
    select: {
      subtotals: { select: { value: true } },
      submission: {
        select: {
          subject: {
            select: {
              submissions: {
                where: {
                  type: SubmissionType.CARBON_INVENTORY_VERIFICATION,
                  status: {
                    in: [
                      SubmissionStatus.APPROVED,
                      SubmissionStatus.APPROVED_AUTOMATICALLY,
                    ],
                  },
                },
                select: { id: true },
                take: 1,
              },
            },
          },
        },
      },
    },
  });

  let totalEmissions = 0;
  let verifiedEmissions = 0;
  for (const inventory of inventories) {
    const inventoryTotal = inventory.subtotals.reduce(
      (sum, row) => sum + Number(row.value),
      0
    );
    totalEmissions += inventoryTotal;
    if ((inventory.submission?.subject.submissions.length ?? 0) > 0) {
      verifiedEmissions += inventoryTotal;
    }
  }

  return { totalEmissions, verifiedEmissions };
}

async function getRecognitionCounts(
  prismaClient: PrismaClient,
  year?: number
): Promise<{ earned: number; underReview: number }> {
  const groups = await prismaClient.submission.groupBy({
    by: ["status"],
    where: {
      type: { in: [...RECOGNITION_SUBMISSION_TYPES] },
      status: {
        in: [
          SubmissionStatus.APPROVED,
          SubmissionStatus.APPROVED_AUTOMATICALLY,
          SubmissionStatus.PENDING,
        ],
      },
      ...(year
        ? {
            subject: {
              carbonInventory: {
                carbonInventory: { year, status: InventoryStatus.ACTIVE },
              },
            },
          }
        : {}),
    },
    _count: { _all: true },
  });

  let earned = 0;
  let underReview = 0;
  for (const g of groups) {
    if (
      g.status === SubmissionStatus.APPROVED ||
      g.status === SubmissionStatus.APPROVED_AUTOMATICALLY
    ) {
      earned += g._count._all;
    } else if (g.status === SubmissionStatus.PENDING) {
      underReview = g._count._all;
    }
  }

  return { earned, underReview };
}
