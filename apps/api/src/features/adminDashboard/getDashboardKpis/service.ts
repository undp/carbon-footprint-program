import type { PrismaClient } from "@repo/database";
import { SubmissionStatus } from "@repo/database";
import type { AdminDashboardKpisResponse } from "@repo/types";

export const getDashboardKpisService = async (
  prismaClient: PrismaClient,
  year?: number
): Promise<AdminDashboardKpisResponse> => {
  const yearFilter = year ? { year } : {};
  const inventoryWhere = { status: "ACTIVE" as const, ...yearFilter };
  const submissionYearWhere = year
    ? { subject: { carbonInventory: { carbonInventory: { year } } } }
    : {};
  const badgeYearWhere = {
    badgeId: { not: null },
    ...submissionYearWhere,
  };

  // --- Parallel batch 1: Independent counts + subtotals ---
  const [
    totalOrganizations,
    measuringInYear,
    subtotals,
    approvedInventoryIds,
    awarded,
    inApplication,
    inReview,
    approved,
    objected,
    organizationsWithSector,
  ] = await Promise.all([
    prismaClient.organization.count(),
    prismaClient.organization.count({
      where: {
        carbonInventories: { some: inventoryWhere },
      },
    }),
    // Single subtotals query with categoryId for both emission totals and scope breakdown
    prismaClient.carbonInventorySubtotalsView.findMany({
      where: { carbonInventory: inventoryWhere },
      select: {
        value: true,
        categoryId: true,
        carbonInventory: { select: { organizationId: true } },
      },
    }),
    prismaClient.submission.findMany({
      where: {
        status: SubmissionStatus.APPROVED,
        subject: {
          carbonInventory: { carbonInventory: inventoryWhere },
        },
      },
      select: {
        subject: {
          select: {
            carbonInventory: { select: { carbonInventoryId: true } },
          },
        },
      },
    }),
    prismaClient.submission.count({
      where: { status: SubmissionStatus.APPROVED, ...badgeYearWhere },
    }),
    prismaClient.submission.count({
      where: { status: SubmissionStatus.PENDING, ...badgeYearWhere },
    }),
    prismaClient.submission.count({
      where: { status: SubmissionStatus.PENDING, ...submissionYearWhere },
    }),
    prismaClient.submission.count({
      where: { status: SubmissionStatus.APPROVED, ...submissionYearWhere },
    }),
    prismaClient.submission.count({
      where: { status: SubmissionStatus.REJECTED, ...submissionYearWhere },
    }),
    prismaClient.organizationData.findMany({
      where: { status: "ACTIVE", sectorId: { not: null } },
      select: {
        organizationId: true,
        sector: { select: { name: true } },
      },
    }),
  ]);

  // --- Emissions totals ---
  const totalEmissions = subtotals.reduce((sum, s) => sum + Number(s.value), 0);

  // --- Verified emissions ---
  const verifiedIdSet = new Set(
    approvedInventoryIds
      .map((s) => s.subject.carbonInventory?.carbonInventoryId)
      .filter((id): id is bigint => id != null)
  );

  // Compute verified emissions from approved inventory subtotals
  const verifiedEmissions =
    verifiedIdSet.size > 0
      ? (
          await prismaClient.carbonInventorySubtotalsView.findMany({
            where: { carbonInventoryId: { in: [...verifiedIdSet] } },
            select: { value: true },
          })
        ).reduce((sum, s) => sum + Number(s.value), 0)
      : 0;

  // --- Organizations by sector ---
  // Seed sector stats from all orgs with sectors (includes zero-emission orgs)
  const orgSectorMap = new Map<bigint, string>();
  const sectorStats = new Map<
    string,
    { count: Set<bigint>; emissions: number }
  >();

  for (const od of organizationsWithSector) {
    if (od.sector) {
      orgSectorMap.set(od.organizationId, od.sector.name);
      if (!sectorStats.has(od.sector.name)) {
        sectorStats.set(od.sector.name, { count: new Set(), emissions: 0 });
      }
      sectorStats.get(od.sector.name)!.count.add(od.organizationId);
    }
  }

  // Add emissions to sector stats from subtotals
  for (const row of subtotals) {
    const orgId = row.carbonInventory.organizationId;
    if (orgId == null) continue;
    const sectorName = orgSectorMap.get(orgId);
    if (!sectorName) continue;
    sectorStats.get(sectorName)!.emissions += Number(row.value);
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
  const categoryIds = [...new Set(subtotals.map((s) => s.categoryId))];
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
  for (const row of subtotals) {
    const position = categoryPositionMap.get(row.categoryId);
    if (position && position >= 1 && position <= 3) {
      scopeTotals[position as 1 | 2 | 3] += Number(row.value);
    }
  }

  const scopeTotal = scopeTotals[1] + scopeTotals[2] + scopeTotals[3];
  let emissionsByScope: AdminDashboardKpisResponse["emissionsByScope"];
  if (scopeTotal > 0) {
    const scope1Percentage =
      Math.round((scopeTotals[1] / scopeTotal) * 10000) / 100;
    const scope2Percentage =
      Math.round((scopeTotals[2] / scopeTotal) * 10000) / 100;
    // Derive scope3 so all three always sum to exactly 100
    const scope3Percentage = Math.max(
      0,
      Math.round((100 - scope1Percentage - scope2Percentage) * 100) / 100
    );
    emissionsByScope = { scope1Percentage, scope2Percentage, scope3Percentage };
  } else {
    emissionsByScope = {
      scope1Percentage: 0,
      scope2Percentage: 0,
      scope3Percentage: 0,
    };
  }

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
