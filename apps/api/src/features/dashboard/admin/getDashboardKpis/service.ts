import type { PrismaClient } from "@repo/database";
import {
  InventoryStatus,
  Prisma,
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
    recognitionsEarned,
    recognitionsUnderReview,
  ] = await Promise.all([
    getOrganizationKpis(prismaClient, year),
    getEmissionsData(prismaClient, year),
    getRecognitionsEarned(prismaClient, year),
    getRecognitionsUnderReview(prismaClient, year),
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
                  ...(approvedAtFilter
                    ? { reviewedAt: approvedAtFilter }
                    : {}),
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
  const inventoryFilter: Prisma.CarbonInventoryWhereInput = {
    status: InventoryStatus.ACTIVE,
    isSelfDeclared: true,
    ...(year ? { year } : {}),
  };

  // Get all matching inventories
  const inventories = await prismaClient.carbonInventory.findMany({
    where: inventoryFilter,
    select: { id: true },
  });
  const inventoryIds = inventories.map((i) => i.id);

  if (inventoryIds.length === 0) {
    return { totalEmissions: 0, verifiedEmissions: 0 };
  }

  // Sum all subtotals for these inventories
  const subtotals = await prismaClient.carbonInventorySubtotalsView.findMany({
    where: { carbonInventoryId: { in: inventoryIds } },
    select: { carbonInventoryId: true, value: true },
  });

  const totalEmissions = subtotals.reduce(
    (sum, row) => sum + Number(row.value),
    0
  );

  // Find inventories with an approved CARBON_INVENTORY_VERIFICATION submission
  const verifiedInventoryIds = await prismaClient.submission
    .findMany({
      where: {
        type: SubmissionType.CARBON_INVENTORY_VERIFICATION,
        status: {
          in: [
            SubmissionStatus.APPROVED,
            SubmissionStatus.APPROVED_AUTOMATICALLY,
          ],
        },
        subject: {
          carbonInventory: {
            carbonInventoryId: { in: inventoryIds },
          },
        },
      },
      select: {
        subject: {
          select: {
            carbonInventory: {
              select: { carbonInventoryId: true },
            },
          },
        },
      },
    })
    .then(
      (subs) =>
        new Set(
          subs
            .map((s) => s.subject.carbonInventory?.carbonInventoryId)
            .filter((id): id is bigint => id !== undefined)
        )
    );

  const verifiedEmissions = subtotals
    .filter((row) => verifiedInventoryIds.has(row.carbonInventoryId))
    .reduce((sum, row) => sum + Number(row.value), 0);

  return { totalEmissions, verifiedEmissions };
}

async function getRecognitionsEarned(
  prismaClient: PrismaClient,
  year?: number
): Promise<number> {
  return prismaClient.submission.count({
    where: {
      type: { in: [...RECOGNITION_SUBMISSION_TYPES] },
      status: {
        in: [
          SubmissionStatus.APPROVED,
          SubmissionStatus.APPROVED_AUTOMATICALLY,
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
  });
}

async function getRecognitionsUnderReview(
  prismaClient: PrismaClient,
  year?: number
): Promise<number> {
  return prismaClient.submission.count({
    where: {
      type: { in: [...RECOGNITION_SUBMISSION_TYPES] },
      status: SubmissionStatus.PENDING,
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
  });
}
