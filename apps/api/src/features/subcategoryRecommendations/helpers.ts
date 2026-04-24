import type { PrismaClient } from "@repo/database";
import {
  SubcategoryRecommendationStatus,
  type SubcategoryRecommendationGroup,
} from "@repo/types";
import { ApplicationConfigError } from "@/errors/ApplicationConfigError.js";

type ActiveRecommendationRow = {
  sectorId: bigint;
  subsectorId: bigint | null;
  subcategoryId: bigint;
  sector: { id: bigint; name: string };
  subsector: { id: bigint; name: string } | null;
};

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

export const loadGroup = async (
  tx: Pick<PrismaClient, "subcategoryRecommendation">,
  sectorId: bigint,
  subsectorId: bigint | null
): Promise<SubcategoryRecommendationGroup | null> => {
  const rows = await tx.subcategoryRecommendation.findMany({
    where: {
      sectorId,
      subsectorId,
      status: SubcategoryRecommendationStatus.ACTIVE,
    },
    select: {
      sectorId: true,
      subsectorId: true,
      subcategoryId: true,
      sector: { select: { id: true, name: true } },
      subsector: { select: { id: true, name: true } },
    },
    orderBy: { subcategoryId: "asc" },
  });

  if (rows.length === 0) {
    return null;
  }

  return buildGroupedResponse(rows)[0] ?? null;
};
