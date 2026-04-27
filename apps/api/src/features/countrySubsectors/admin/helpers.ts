import {
  CountrySubsectorStatus,
  OrganizationMainActivityStatus,
} from "@repo/database";
import type { AdminCountrySubsector } from "@repo/types";

type CountrySubsectorRow = {
  id: bigint;
  countrySectorId: bigint;
  name: string;
  description: string | null;
  status: CountrySubsectorStatus;
  createdAt: Date;
  updatedAt: Date | null;
  createdById: bigint | null;
  updatedById: bigint | null;
  _count?: {
    organizationData: number;
    organizationMainActivities: number;
    subcategoryRecommendations: number;
  };
};

export const mapCountrySubsectorToAdmin = (
  row: CountrySubsectorRow
): AdminCountrySubsector => {
  const counts = row._count ?? {
    organizationData: 0,
    organizationMainActivities: 0,
    subcategoryRecommendations: 0,
  };
  return {
    id: row.id.toString(),
    countrySectorId: row.countrySectorId.toString(),
    name: row.name,
    description: row.description,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt ? row.updatedAt.toISOString() : null,
    createdById: row.createdById ? row.createdById.toString() : null,
    updatedById: row.updatedById ? row.updatedById.toString() : null,
    isInUse:
      counts.organizationData +
        counts.organizationMainActivities +
        counts.subcategoryRecommendations >
      0,
  };
};

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
      organizationData: true,
      organizationMainActivities: {
        where: { status: OrganizationMainActivityStatus.ACTIVE },
      },
      subcategoryRecommendations: true,
    },
  },
} as const;
