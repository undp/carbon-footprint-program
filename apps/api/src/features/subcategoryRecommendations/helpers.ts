import type { Prisma, PrismaClient } from "@repo/database";
import type { SubcategoryRecommendationGroup } from "@repo/types";
import { ApplicationConfigError } from "@/errors/ApplicationConfigError.js";

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

// TODO: replace with DEFAULT_COUNTRY_ID system parameter once available.
// Mirrors the precedent in createMethodology and createOrganization.
export const resolveDefaultCountryId = async (
  prismaClient: Pick<PrismaClient, "country">
): Promise<bigint> => {
  const country = await prismaClient.country.findFirst({
    orderBy: { id: "asc" },
    select: { id: true },
  });

  if (!country) {
    throw new ApplicationConfigError(
      "No country found; at least one country must be seeded"
    );
  }

  return country.id;
};
