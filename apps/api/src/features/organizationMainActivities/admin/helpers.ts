import { OrganizationMainActivityStatus } from "@repo/database";
import type { AdminOrganizationMainActivity } from "@repo/types";

type MainActivityRow = {
  id: bigint;
  name: string;
  description: string | null;
  status: OrganizationMainActivityStatus;
  countrySectorId: bigint | null;
  countrySubsectorId: bigint | null;
  createdAt: Date;
  updatedAt: Date | null;
  createdById: bigint | null;
  updatedById: bigint | null;
  countrySector: { name: string } | null;
  countrySubsector: { name: string } | null;
  _count?: { organizationData: number };
};

export const mapMainActivityToAdmin = (
  row: MainActivityRow
): AdminOrganizationMainActivity => {
  const counts = row._count ?? { organizationData: 0 };
  return {
    id: row.id.toString(),
    name: row.name,
    description: row.description,
    status: row.status,
    countrySectorId: row.countrySectorId?.toString() ?? null,
    countrySubsectorId: row.countrySubsectorId?.toString() ?? null,
    countrySectorName: row.countrySector?.name ?? null,
    countrySubsectorName: row.countrySubsector?.name ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt ? row.updatedAt.toISOString() : null,
    createdById: row.createdById?.toString() ?? null,
    updatedById: row.updatedById?.toString() ?? null,
    isInUse: counts.organizationData > 0,
  };
};

export const adminMainActivitySelect = {
  id: true,
  name: true,
  description: true,
  status: true,
  countrySectorId: true,
  countrySubsectorId: true,
  createdAt: true,
  updatedAt: true,
  createdById: true,
  updatedById: true,
  countrySector: { select: { name: true } },
  countrySubsector: { select: { name: true } },
  _count: {
    select: {
      organizationData: true,
    },
  },
} as const;
