import {
  CountrySectorStatus,
  CountrySubsectorStatus,
  OrganizationMainActivityStatus,
} from "@repo/database";
import type { AdminCountrySector } from "@repo/types";

/**
 * Maps a Prisma `country_sector` row plus its `_count` aggregations into the
 * admin-facing payload. `isInUse` is `true` when ANY user-data or catalog-level
 * reference points at this row (catalog references also block soft-delete; user-data
 * references only drive the in-use warning dialog).
 */
type CountrySectorRow = {
  id: bigint;
  countryId: bigint;
  name: string;
  description: string | null;
  status: CountrySectorStatus;
  createdAt: Date;
  updatedAt: Date | null;
  createdById: bigint | null;
  updatedById: bigint | null;
  _count?: {
    organizationData: number;
    subsectors: number;
    organizationMainActivities: number;
    subcategoryRecommendations: number;
  };
};

export const mapCountrySectorToAdmin = (
  row: CountrySectorRow
): AdminCountrySector => {
  const counts = row._count ?? {
    organizationData: 0,
    subsectors: 0,
    organizationMainActivities: 0,
    subcategoryRecommendations: 0,
  };
  return {
    id: row.id.toString(),
    countryId: row.countryId.toString(),
    name: row.name,
    description: row.description,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt ? row.updatedAt.toISOString() : null,
    createdById: row.createdById ? row.createdById.toString() : null,
    updatedById: row.updatedById ? row.updatedById.toString() : null,
    isInUse:
      counts.organizationData +
        counts.subsectors +
        counts.organizationMainActivities +
        counts.subcategoryRecommendations >
      0,
  };
};

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
} as const;
