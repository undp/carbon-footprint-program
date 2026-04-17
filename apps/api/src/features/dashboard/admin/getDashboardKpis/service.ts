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

  const accreditedOrgWhere = {
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
  };

  const [totalOrganizations, measuringOrganizations] = await Promise.all([
    prismaClient.organization.count({ where: accreditedOrgWhere }),
    prismaClient.organization.count({
      where: {
        ...accreditedOrgWhere,
        carbonInventories: {
          some: {
            status: InventoryStatus.ACTIVE,
            isSelfDeclared: true,
            year: inventoryYearFilter,
          },
        },
      },
    }),
  ]);

  return { totalOrganizations, measuringOrganizations };
}

async function getEmissionsData(
  prismaClient: PrismaClient,
  year?: number
): Promise<{ totalEmissions: number; verifiedEmissions: number }> {
  const activeInventoryFilter = {
    status: InventoryStatus.ACTIVE,
    isSelfDeclared: true,
    ...(year ? { year } : {}),
  };

  const [totalResult, verifiedResult] = await Promise.all([
    prismaClient.carbonInventorySubtotalsView.aggregate({
      where: { carbonInventory: activeInventoryFilter },
      _sum: { value: true },
    }),
    prismaClient.carbonInventorySubtotalsView.aggregate({
      where: {
        carbonInventory: {
          ...activeInventoryFilter,
          submission: {
            subject: {
              submissions: {
                some: {
                  type: SubmissionType.CARBON_INVENTORY_VERIFICATION,
                  status: {
                    in: [
                      SubmissionStatus.APPROVED,
                      SubmissionStatus.APPROVED_AUTOMATICALLY,
                    ],
                  },
                },
              },
            },
          },
        },
      },
      _sum: { value: true },
    }),
  ]);

  return {
    totalEmissions: Number(totalResult._sum.value ?? 0),
    verifiedEmissions: Number(verifiedResult._sum.value ?? 0),
  };
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
