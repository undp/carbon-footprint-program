import type { PrismaClient } from "@repo/database";
import { SubmissionStatus } from "@repo/database";
import type { AdminDashboardKpisResponse } from "@repo/types";

export const getDashboardKpisService = async (
  prismaClient: PrismaClient,
  year?: number
): Promise<AdminDashboardKpisResponse> => {
  const yearFilter = year ? { year } : {};

  // --- Organizations ---
  const totalOrganizations = await prismaClient.organization.count();

  const measuringInYear = await prismaClient.organization.count({
    where: {
      carbonInventories: {
        some: {
          ...yearFilter,
          status: "ACTIVE",
        },
      },
    },
  });

  // --- Emissions ---
  // Total emissions from all active inventories (optionally filtered by year)
  const allSubtotals = await prismaClient.carbonInventorySubtotalsView.findMany(
    {
      where: {
        carbonInventory: {
          status: "ACTIVE",
          ...yearFilter,
        },
      },
      select: { value: true },
    }
  );
  const totalEmissions = allSubtotals.reduce(
    (sum, s) => sum + Number(s.value),
    0
  );

  // Verified emissions: from inventories that have an APPROVED submission
  const approvedInventoryIds = await prismaClient.submission.findMany({
    where: {
      status: SubmissionStatus.APPROVED,
      subject: {
        carbonInventory: {
          carbonInventory: {
            status: "ACTIVE",
            ...yearFilter,
          },
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
  });

  const verifiedIds = approvedInventoryIds
    .map((s) => s.subject.carbonInventory?.carbonInventoryId)
    .filter((id): id is bigint => id != null);

  let verifiedEmissions = 0;
  if (verifiedIds.length > 0) {
    const verifiedSubtotals =
      await prismaClient.carbonInventorySubtotalsView.findMany({
        where: { carbonInventoryId: { in: verifiedIds } },
        select: { value: true },
      });
    verifiedEmissions = verifiedSubtotals.reduce(
      (sum, s) => sum + Number(s.value),
      0
    );
  }

  // --- Recognitions ---
  // Awarded: APPROVED submissions that have a badge
  const awarded = await prismaClient.submission.count({
    where: {
      status: SubmissionStatus.APPROVED,
      badgeId: { not: null },
      ...(year
        ? { subject: { carbonInventory: { carbonInventory: { year } } } }
        : {}),
    },
  });

  // In application: PENDING submissions that have a badge
  const inApplication = await prismaClient.submission.count({
    where: {
      status: SubmissionStatus.PENDING,
      badgeId: { not: null },
      ...(year
        ? { subject: { carbonInventory: { carbonInventory: { year } } } }
        : {}),
    },
  });

  // --- Submission summary ---
  const submissionWhere = year
    ? { subject: { carbonInventory: { carbonInventory: { year } } } }
    : {};

  const [inReview, approved, objected] = await Promise.all([
    prismaClient.submission.count({
      where: { status: SubmissionStatus.PENDING, ...submissionWhere },
    }),
    prismaClient.submission.count({
      where: { status: SubmissionStatus.APPROVED, ...submissionWhere },
    }),
    prismaClient.submission.count({
      where: { status: SubmissionStatus.REJECTED, ...submissionWhere },
    }),
  ]);

  // --- Organizations by sector ---
  const organizationsWithSector =
    await prismaClient.organizationData.findMany({
      where: {
        status: "ACTIVE",
        sectorId: { not: null },
      },
      select: {
        organizationId: true,
        sector: { select: { name: true } },
      },
    });

  // Build a map of org → sector
  const orgSectorMap = new Map<bigint, string>();
  for (const od of organizationsWithSector) {
    if (od.sector) {
      orgSectorMap.set(od.organizationId, od.sector.name);
    }
  }

  // Get emissions per organization from subtotals
  const orgEmissions = await prismaClient.carbonInventorySubtotalsView.findMany(
    {
      where: {
        carbonInventory: {
          status: "ACTIVE",
          ...yearFilter,
        },
      },
      select: {
        value: true,
        carbonInventory: {
          select: { organizationId: true },
        },
      },
    }
  );

  const sectorStats = new Map<
    string,
    { count: Set<bigint>; emissions: number }
  >();
  for (const row of orgEmissions) {
    const orgId = row.carbonInventory.organizationId;
    if (orgId == null) continue;
    const sectorName = orgSectorMap.get(orgId);
    if (!sectorName) continue;

    if (!sectorStats.has(sectorName)) {
      sectorStats.set(sectorName, { count: new Set(), emissions: 0 });
    }
    const stats = sectorStats.get(sectorName)!;
    stats.count.add(orgId);
    stats.emissions += Number(row.value);
  }

  const organizationsBySector = Array.from(sectorStats.entries()).map(
    ([sectorName, stats]) => ({
      sectorName,
      count: stats.count.size,
      emissions: Math.round(stats.emissions * 100) / 100,
    })
  );

  // --- Emissions by scope ---
  // Categories with position 1, 2, 3 map to Scope 1, 2, 3
  const subtotalsByCategory =
    await prismaClient.carbonInventorySubtotalsView.findMany({
      where: {
        carbonInventory: {
          status: "ACTIVE",
          ...yearFilter,
        },
      },
      select: {
        value: true,
        categoryId: true,
      },
    });

  // Get category positions
  const categoryIds = [
    ...new Set(subtotalsByCategory.map((s) => s.categoryId)),
  ];
  const categories =
    categoryIds.length > 0
      ? await prismaClient.category.findMany({
          where: { id: { in: categoryIds } },
          select: { id: true, position: true },
        })
      : [];

  const categoryPositionMap = new Map<bigint, number>();
  for (const cat of categories) {
    categoryPositionMap.set(cat.id, cat.position);
  }

  const scopeTotals = { 1: 0, 2: 0, 3: 0 };
  for (const row of subtotalsByCategory) {
    const position = categoryPositionMap.get(row.categoryId);
    if (position && position >= 1 && position <= 3) {
      scopeTotals[position as 1 | 2 | 3] += Number(row.value);
    }
  }

  const scopeTotal = scopeTotals[1] + scopeTotals[2] + scopeTotals[3];
  const emissionsByScope =
    scopeTotal > 0
      ? {
          scope1Percentage:
            Math.round((scopeTotals[1] / scopeTotal) * 10000) / 100,
          scope2Percentage:
            Math.round((scopeTotals[2] / scopeTotal) * 10000) / 100,
          scope3Percentage:
            Math.round((scopeTotals[3] / scopeTotal) * 10000) / 100,
        }
      : { scope1Percentage: 0, scope2Percentage: 0, scope3Percentage: 0 };

  return {
    organizations: {
      total: totalOrganizations,
      measuringInYear,
    },
    emissions: {
      total: Math.round(totalEmissions * 100) / 100,
      verified: Math.round(verifiedEmissions * 100) / 100,
    },
    recognitions: {
      awarded,
      inApplication,
    },
    submissionSummary: {
      inReview,
      approved,
      objected,
    },
    organizationsBySector,
    emissionsByScope,
  };
};
