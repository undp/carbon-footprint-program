import type { SubcategoryRecommendationGroup } from "@repo/types";
import type { CountrySector, CountrySubsector } from "@repo/database";

type RecommendationRowWithRelations = {
  subcategoryId: bigint;
  sectorId: bigint;
  subsectorId: bigint | null;
  sector: Pick<CountrySector, "id" | "name">;
  subsector: Pick<CountrySubsector, "id" | "name"> | null;
};

export const buildGroupedResponse = (
  rows: RecommendationRowWithRelations[]
): SubcategoryRecommendationGroup[] => {
  const map = new Map<string, SubcategoryRecommendationGroup>();

  for (const row of rows) {
    const key = `${row.sectorId.toString()}-${row.subsectorId?.toString() ?? "null"}`;
    const existing = map.get(key);
    if (existing) {
      existing.subcategoryIds.push(Number(row.subcategoryId));
    } else {
      map.set(key, {
        sectorId: Number(row.sectorId),
        subsectorId: row.subsectorId !== null ? Number(row.subsectorId) : null,
        sectorName: row.sector.name,
        subsectorName: row.subsector?.name ?? null,
        subcategoryIds: [Number(row.subcategoryId)],
      });
    }
  }

  return Array.from(map.values());
};
