import {
  CountrySubsectorStatus,
  OrganizationMainActivityStatus,
  Prisma,
  SubcategoryRecommendationStatus,
} from "@repo/database";
import type { AdminCountrySector } from "@repo/types";

/**
 * Standard `select` shape used by every admin endpoint that returns a `country_sector`,
 * including the `_count` of references that drive `impactedChildren` (the delete-warning
 * dialog). Active-only counts are used because DELETED catalog children should not block
 * soft-delete (the parent has already broken the relationship by being soft-deleted).
 */
export const adminCountrySectorSelect = {
  id: true,
  countryId: true,
  name: true,
  description: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  createdById: true,
  updatedById: true,
  _count: {
    select: {
      organizationData: true,
      subsectors: { where: { status: CountrySubsectorStatus.ACTIVE } },
      organizationMainActivities: {
        where: { status: OrganizationMainActivityStatus.ACTIVE },
      },
      subcategoryRecommendations: {
        where: { status: SubcategoryRecommendationStatus.ACTIVE },
      },
    },
  },
} satisfies Prisma.CountrySectorSelect;

type CountrySectorRow = Prisma.CountrySectorGetPayload<{
  select: typeof adminCountrySectorSelect;
}>;

/**
 * Maps a Prisma `country_sector` row plus its `_count` aggregations into the
 * admin-facing payload. `impactedChildren` carries the per-reference counts the
 * delete-warning dialog renders.
 */
export const mapCountrySectorToAdmin = (
  row: CountrySectorRow
): AdminCountrySector => {
  const counts = row._count;
  return {
    id: row.id.toString(),
    countryId: row.countryId.toString(),
    name: row.name,
    description: row.description,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt ? row.updatedAt.toISOString() : null,
    createdById: row.createdById?.toString() ?? null,
    updatedById: row.updatedById?.toString() ?? null,
    impactedChildren: {
      activeSubsectors: counts.subsectors,
      activeMainActivities: counts.organizationMainActivities,
      organizationData: counts.organizationData,
      subcategoryRecommendations: counts.subcategoryRecommendations,
    },
  };
};
