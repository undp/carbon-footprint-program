import {
  OrganizationMainActivityStatus,
  Prisma,
  SubcategoryRecommendationStatus,
} from "@repo/database";
import type { AdminCountrySubsector } from "@repo/types";

export const adminCountrySubsectorSelect = {
  id: true,
  countrySectorId: true,
  name: true,
  description: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  createdById: true,
  updatedById: true,
  _count: {
    select: {
      organizationMainActivities: {
        where: { status: OrganizationMainActivityStatus.ACTIVE },
      },
      subcategoryRecommendations: {
        where: { status: SubcategoryRecommendationStatus.ACTIVE },
      },
    },
  },
} satisfies Prisma.CountrySubsectorSelect;

type CountrySubsectorRow = Prisma.CountrySubsectorGetPayload<{
  select: typeof adminCountrySubsectorSelect;
}>;

/**
 * `organizationDataCount` is passed in rather than aggregated with the others: an
 * organization may reference an activity as its primary or its secondary one, and
 * `_count` cannot union the two columns without counting twice a row that
 * declares the same activity in both. See `countOrganizationDataBySubsector`.
 */
export const mapCountrySubsectorToAdmin = (
  row: CountrySubsectorRow,
  organizationDataCount: number
): AdminCountrySubsector => {
  const counts = row._count;
  return {
    id: row.id.toString(),
    countrySectorId: row.countrySectorId.toString(),
    name: row.name,
    description: row.description,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt ? row.updatedAt.toISOString() : null,
    createdById: row.createdById?.toString() ?? null,
    updatedById: row.updatedById?.toString() ?? null,
    impactedChildren: {
      activeMainActivities: counts.organizationMainActivities,
      organizationData: organizationDataCount,
      subcategoryRecommendations: counts.subcategoryRecommendations,
    },
  };
};
