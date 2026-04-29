import type { Prisma } from "@repo/database";
import type { SubcategoryRecommendationGroup } from "@repo/types";

export const methodologyVersionFilter = (
  methodologyId: string
): Prisma.SubcategoryRecommendationWhereInput => ({
  subcategory: {
    category: { methodologyVersionId: BigInt(methodologyId) },
  },
});

export const activeRecommendationRowSelect = {
  sectorId: true,
  subsectorId: true,
  subcategoryId: true,
  sector: { select: { id: true, name: true } },
  subsector: { select: { id: true, name: true } },
} satisfies Prisma.SubcategoryRecommendationSelect;

type ActiveRecommendationRow = Prisma.SubcategoryRecommendationGetPayload<{
  select: typeof activeRecommendationRowSelect;
}>;

export const buildGroupedResponse = (
  rows: ActiveRecommendationRow[]
): SubcategoryRecommendationGroup[] => {
  const groups = new Map<string, SubcategoryRecommendationGroup>();

  for (const row of rows) {
    const key = `${row.sectorId.toString()}-${row.subsectorId?.toString() ?? "null"}`;
    const existing = groups.get(key);
    if (existing) {
      existing.subcategoryIds.push(row.subcategoryId.toString());
      continue;
    }

    groups.set(key, {
      sectorId: row.sectorId.toString(),
      subsectorId: row.subsectorId?.toString() ?? null,
      sectorName: row.sector.name,
      subsectorName: row.subsector?.name ?? null,
      subcategoryIds: [row.subcategoryId.toString()],
    });
  }

  return [...groups.values()];
};
