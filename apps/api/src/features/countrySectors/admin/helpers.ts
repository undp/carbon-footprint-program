import {
  CountrySubsectorStatus,
  OrganizationMainActivityStatus,
  Prisma,
} from "@repo/database";
import type { AdminCountrySector } from "@repo/types";

/**
 * Standard `select` shape used by every admin endpoint that returns a `country_sector`,
 * including `_count` of the references that drive `isInUse`. Active-only counts are used
 * because DELETED catalog children should not block soft-delete or affect the in-use
 * dialog (the parent has already broken the relationship by being soft-deleted).
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
      subcategoryRecommendations: true,
    },
  },
} satisfies Prisma.CountrySectorSelect;

type CountrySectorRow = Prisma.CountrySectorGetPayload<{
  select: typeof adminCountrySectorSelect;
}>;

/**
 * Maps a Prisma `country_sector` row plus its `_count` aggregations into the
 * admin-facing payload. `isInUse` is `true` when ANY user-data or catalog-level
 * reference points at this row (catalog references also block soft-delete; user-data
 * references only drive the in-use warning dialog).
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
    isInUse:
      counts.organizationData +
        counts.subsectors +
        counts.organizationMainActivities +
        counts.subcategoryRecommendations >
      0,
    impactedChildren: {
      activeSubsectors: counts.subsectors,
      activeMainActivities: counts.organizationMainActivities,
      organizationData: counts.organizationData,
      subcategoryRecommendations: counts.subcategoryRecommendations,
    },
  };
};
