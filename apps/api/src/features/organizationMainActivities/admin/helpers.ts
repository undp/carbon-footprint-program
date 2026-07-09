import { Prisma } from "@repo/database";
import type { AdminOrganizationMainActivity } from "@repo/types";

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
} satisfies Prisma.OrganizationMainActivitySelect;

type MainActivityRow = Prisma.OrganizationMainActivityGetPayload<{
  select: typeof adminMainActivitySelect;
}>;

export const mapMainActivityToAdmin = (
  row: MainActivityRow
): AdminOrganizationMainActivity => {
  const counts = row._count;
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
    impactedChildren: {
      organizationData: counts.organizationData,
    },
  };
};
