import type { PrismaClient } from "@repo/database";
import {
  InventoryStatus,
  OrganizationDataStatus,
  SubmissionType,
  SubmissionStatus,
} from "@repo/database";
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
  const approvedAtFilter = year
    ? { lt: new Date(`${year + 1}-01-01T00:00:00.000Z`) }
    : undefined;

  const groups = await prismaClient.organizationData.groupBy({
    by: ["sectorId"],
    where: {
      status: OrganizationDataStatus.ACTIVE,
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
    _count: { _all: true },
  });

  const sectorIds = groups
    .map((g) => g.sectorId)
    .filter((id): id is bigint => id !== null);
  const sectors =
    sectorIds.length > 0
      ? await prismaClient.countrySector.findMany({
          where: { id: { in: sectorIds } },
          select: { id: true, name: true },
        })
      : [];
  const sectorNameMap = new Map(sectors.map((s) => [s.id, s.name]));

  return applySortAndLimit(
    groups.map((g) => ({
      sectorName:
        g.sectorId !== null ? (sectorNameMap.get(g.sectorId) ?? null) : null,
      value: g._count._all,
    })),
    limit
  ).map(({ sectorName, value }) => ({ sectorName, organizationCount: value }));
}

async function getSectorEmissions(
  prismaClient: PrismaClient,
  limit: number,
  year?: number
): Promise<{ sectorName: string | null; totalEmissions: number }[]> {
  const groups = await prismaClient.carbonInventorySectorSubtotalsView.groupBy({
    by: ["sectorId", "sectorName"],
    where: {
      status: InventoryStatus.ACTIVE,
      isSelfDeclared: true,
      ...(year ? { year } : {}),
    },
    _sum: { value: true },
  });

  return applySortAndLimit(
    groups.map((g) => ({
      sectorName: g.sectorName,
      value: Number(g._sum.value ?? 0),
    })),
    limit
  ).map(({ sectorName, value }) => ({ sectorName, totalEmissions: value }));
}

/**
 * Sorts entries descending by value (then alphabetically for ties, null last)
 * and returns all entries up to and including the cutoff at position `limit-1`.
 */
function applySortAndLimit<
  T extends { sectorName: string | null; value: number },
>(entries: T[], limit: number): T[] {
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
