import type { PrismaClient } from "@repo/database";
import { SubmissionType, SubmissionStatus } from "@repo/database";
import type { GetAdminDashboardKpisResponse } from "@repo/types";

const LAST_2_YEARS_WINDOW = 2;

const RECOGNITION_SUBMISSION_TYPES = [
  SubmissionType.CARBON_INVENTORY_CALCULATION,
  SubmissionType.CARBON_INVENTORY_VERIFICATION,
  SubmissionType.REDUCTION_PLAN_VERIFICATION,
  SubmissionType.NEUTRALIZATION_PLAN_VERIFICATION,
] as const;

export const getDashboardKpisService = async (
  prismaClient: PrismaClient,
  year?: number
): Promise<GetAdminDashboardKpisResponse> => {
  const [
    totalOrganizations,
    measuringOrganizations,
    emissionsData,
    recognitionsEarned,
    recognitionsUnderReview,
  ] = await Promise.all([
    getTotalOrganizations(prismaClient, year),
    getMeasuringOrganizations(prismaClient, year),
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

async function getTotalOrganizations(
  prismaClient: PrismaClient,
  year?: number
): Promise<number> {
  // Cumulative: count distinct organizations with an approved ORGANIZATION_ACCREDITATION
  // When year is given, only count those approved up to and including end of that year
  const approvedAtFilter = year
    ? { lt: new Date(`${year + 1}-01-01T00:00:00.000Z`) }
    : undefined;

  const submissions = await prismaClient.submission.findMany({
    where: {
      type: SubmissionType.ORGANIZATION_ACCREDITATION,
      status: {
        in: [SubmissionStatus.APPROVED, SubmissionStatus.APPROVED_AUTOMATICALLY],
      },
      ...(approvedAtFilter ? { reviewedAt: approvedAtFilter } : {}),
    },
    select: {
      subject: {
        select: {
          organizationData: {
            select: {
              organizationData: {
                select: { organizationId: true },
              },
            },
          },
        },
      },
    },
  });

  const organizationIds = new Set<bigint>();
  for (const sub of submissions) {
    const orgId = sub.subject.organizationData?.organizationData?.organizationId;
    if (orgId !== undefined) {
      organizationIds.add(orgId);
    }
  }

  return organizationIds.size;
}

async function getMeasuringOrganizations(
  prismaClient: PrismaClient,
  year?: number
): Promise<number> {
  const currentYear = new Date().getFullYear();

  let inventoryYearFilter:
    | { equals: number }
    | { gte: number; lte: number };
  if (year) {
    inventoryYearFilter = { equals: year };
  } else {
    inventoryYearFilter = {
      gte: currentYear - (LAST_2_YEARS_WINDOW - 1),
      lte: currentYear,
    };
  }

  // Find organizations with at least one ACTIVE self-declared inventory in the year window
  // that also have an approved ORGANIZATION_ACCREDITATION submission
  const inventories = await prismaClient.carbonInventory.findMany({
    where: {
      status: "ACTIVE",
      isSelfDeclared: true,
      year: inventoryYearFilter,
      organizationId: { not: null },
      organization: {
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
                  },
                },
              },
            },
          },
        },
      },
    },
    select: { organizationId: true },
    distinct: ["organizationId"],
  });

  return inventories.length;
}

async function getEmissionsData(
  prismaClient: PrismaClient,
  year?: number
): Promise<{ totalEmissions: number; verifiedEmissions: number }> {
  const inventoryFilter = {
    status: "ACTIVE" as const,
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
          in: [SubmissionStatus.APPROVED, SubmissionStatus.APPROVED_AUTOMATICALLY],
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
    .then((subs) =>
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
        in: [SubmissionStatus.APPROVED, SubmissionStatus.APPROVED_AUTOMATICALLY],
      },
      ...(year
        ? {
            subject: {
              carbonInventory: {
                carbonInventory: { year, status: "ACTIVE" },
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
                carbonInventory: { year, status: "ACTIVE" },
              },
            },
          }
        : {}),
    },
  });
}
