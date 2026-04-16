import type { PrismaClient } from "@repo/database";
import { SubmissionType, SubmissionStatus } from "@repo/database";
import type { GetAdminDashboardSectorChartResponse } from "@repo/types";

export const getDashboardSectorChartService = async (
  prismaClient: PrismaClient,
  limit: number,
  year?: number
): Promise<GetAdminDashboardSectorChartResponse> => {
  const [sectorRanking, sectorEmissions] = await Promise.all([
    getSectorRanking(prismaClient, limit, year),
    getSectorEmissions(prismaClient, limit, year),
  ]);

  return { sectorRanking, sectorEmissions };
};

async function getSectorRanking(
  prismaClient: PrismaClient,
  limit: number,
  year?: number
): Promise<{ sectorName: string | null; organizationCount: number }[]> {
  // Cumulative: count enrolled orgs per sector
  // Sector comes from OrganizationData.sectorId (active organization data)
  const approvedAtFilter = year
    ? { lt: new Date(`${year + 1}-01-01T00:00:00.000Z`) }
    : undefined;

  // Get all approved org accreditation submissions with their org's sector
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
                select: {
                  organizationId: true,
                  sector: {
                    select: { name: true },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  // Deduplicate by organizationId (count each org only once)
  const orgSectorMap = new Map<bigint, string | null>();
  for (const sub of submissions) {
    const orgData = sub.subject.organizationData?.organizationData;
    if (!orgData) continue;
    const orgId = orgData.organizationId;
    if (!orgSectorMap.has(orgId)) {
      orgSectorMap.set(orgId, orgData.sector?.name ?? null);
    }
  }

  // Group by sector name
  const sectorCounts = new Map<string | null, number>();
  for (const sectorName of orgSectorMap.values()) {
    sectorCounts.set(sectorName, (sectorCounts.get(sectorName) ?? 0) + 1);
  }

  return applySortAndLimit(
    Array.from(sectorCounts.entries()).map(([sectorName, organizationCount]) => ({
      sectorName,
      value: organizationCount,
    })),
    limit
  ).map(({ sectorName, value }) => ({ sectorName, organizationCount: value }));
}

async function getSectorEmissions(
  prismaClient: PrismaClient,
  limit: number,
  year?: number
): Promise<{ sectorName: string | null; totalEmissions: number }[]> {
  const inventoryFilter = {
    status: "ACTIVE" as const,
    isSelfDeclared: true,
    ...(year ? { year } : {}),
  };

  // Get relevant inventories with their organization's active data sector
  const inventories = await prismaClient.carbonInventory.findMany({
    where: { ...inventoryFilter, organizationId: { not: null } },
    select: {
      id: true,
      organization: {
        select: {
          data: {
            where: { status: "ACTIVE" },
            select: {
              sector: { select: { name: true } },
            },
            take: 1,
          },
        },
      },
    },
  });

  if (inventories.length === 0) return [];

  const inventoryIds = inventories.map((i) => i.id);

  // Build map: inventoryId → sector name
  const inventorySectorMap = new Map<bigint, string | null>();
  for (const inv of inventories) {
    const sectorName = inv.organization?.data[0]?.sector?.name ?? null;
    inventorySectorMap.set(inv.id, sectorName);
  }

  // Get subtotals for these inventories
  const subtotals = await prismaClient.carbonInventorySubtotalsView.findMany({
    where: { carbonInventoryId: { in: inventoryIds } },
    select: { carbonInventoryId: true, value: true },
  });

  // Group emissions by sector
  const sectorEmissionsMap = new Map<string | null, number>();
  for (const row of subtotals) {
    const sectorName = inventorySectorMap.get(row.carbonInventoryId) ?? null;
    sectorEmissionsMap.set(
      sectorName,
      (sectorEmissionsMap.get(sectorName) ?? 0) + Number(row.value)
    );
  }

  return applySortAndLimit(
    Array.from(sectorEmissionsMap.entries()).map(([sectorName, value]) => ({
      sectorName,
      value,
    })),
    limit
  ).map(({ sectorName, value }) => ({ sectorName, totalEmissions: value }));
}

/**
 * Sorts entries descending by value (then alphabetically for ties, null last)
 * and returns all entries up to and including the cutoff at position `limit-1`.
 */
function applySortAndLimit<T extends { sectorName: string | null; value: number }>(
  entries: T[],
  limit: number
): T[] {
  const sorted = [...entries].sort((a, b) => {
    if (b.value !== a.value) return b.value - a.value;
    if (a.sectorName === null && b.sectorName === null) return 0;
    if (a.sectorName === null) return 1;
    if (b.sectorName === null) return -1;
    return a.sectorName.localeCompare(b.sectorName);
  });

  if (sorted.length <= limit) return sorted;

  const cutoffValue = sorted[limit - 1].value;
  return sorted.filter((s) => s.value >= cutoffValue);
}
