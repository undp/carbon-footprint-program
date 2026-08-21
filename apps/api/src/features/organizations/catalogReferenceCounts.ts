import type { Prisma, PrismaClient } from "@repo/database";

type Client = PrismaClient | Prisma.TransactionClient;

/**
 * Accumulates one group's row count against every catalog row it reaches. A group
 * that reaches the same row twice — an organization declaring one activity as both
 * its primary and its secondary — contributes once, which is the whole point: the
 * delete-warning dialog would otherwise tell an admin that twice as many
 * organizations are affected as really are.
 */
const accumulate = (
  counts: Map<string, number>,
  rowCount: number,
  reachedIds: (string | null | undefined)[]
): void => {
  for (const id of new Set(reachedIds)) {
    if (id === null || id === undefined || !counts.has(id)) continue;
    counts.set(id, (counts.get(id) ?? 0) + rowCount);
  }
};

const emptyCounts = (ids: bigint[]): Map<string, number> =>
  new Map(ids.map((id) => [id.toString(), 0]));

/**
 * Counts, per subsector, the `organization_data` rows that reference it either as
 * the primary economic activity (`subsector_id`) or as the secondary one
 * (`secondary_subsector_id`).
 *
 * Grouping by both columns at once keeps this to a single query whose result set
 * is bounded by the number of distinct activity pairs, not by the number of
 * organizations — and it is the only shape that can tell a row referencing the
 * same activity twice from two rows referencing it once each.
 */
export const countOrganizationDataBySubsector = async (
  prisma: Client,
  subsectorIds: bigint[]
): Promise<Map<string, number>> => {
  if (subsectorIds.length === 0) return new Map();

  const groups = await prisma.organizationData.groupBy({
    by: ["subsectorId", "secondarySubsectorId"],
    where: {
      OR: [
        { subsectorId: { in: subsectorIds } },
        { secondarySubsectorId: { in: subsectorIds } },
      ],
    },
    _count: { _all: true },
  });

  const counts = emptyCounts(subsectorIds);
  for (const group of groups) {
    accumulate(counts, group._count._all, [
      group.subsectorId?.toString(),
      group.secondarySubsectorId?.toString(),
    ]);
  }
  return counts;
};

/**
 * Counts, per sector, the `organization_data` rows that reference it — directly
 * through `sector_id`, or indirectly because their secondary economic activity
 * belongs to it. The indirect path matters because soft-deleting a sector cascades
 * to its activities, so an organization whose only link to the sector is its
 * secondary activity is affected all the same.
 */
export const countOrganizationDataBySector = async (
  prisma: Client,
  sectorIds: bigint[]
): Promise<Map<string, number>> => {
  if (sectorIds.length === 0) return new Map();

  const groups = await prisma.organizationData.groupBy({
    by: ["sectorId", "secondarySubsectorId"],
    where: {
      OR: [
        { sectorId: { in: sectorIds } },
        { secondarySubsector: { countrySectorId: { in: sectorIds } } },
      ],
    },
    _count: { _all: true },
  });

  const secondarySubsectorIds = [
    ...new Set(
      groups.flatMap((group) =>
        group.secondarySubsectorId ? [group.secondarySubsectorId] : []
      )
    ),
  ];
  const secondarySubsectors =
    secondarySubsectorIds.length > 0
      ? await prisma.countrySubsector.findMany({
          where: { id: { in: secondarySubsectorIds } },
          select: { id: true, countrySectorId: true },
        })
      : [];
  const sectorBySubsector = new Map(
    secondarySubsectors.map((subsector) => [
      subsector.id.toString(),
      subsector.countrySectorId.toString(),
    ])
  );

  const counts = emptyCounts(sectorIds);
  for (const group of groups) {
    const viaSecondary = group.secondarySubsectorId
      ? sectorBySubsector.get(group.secondarySubsectorId.toString())
      : null;
    accumulate(counts, group._count._all, [
      group.sectorId?.toString(),
      viaSecondary,
    ]);
  }
  return counts;
};
