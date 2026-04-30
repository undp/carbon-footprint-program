import { Prisma } from "@repo/database";
import type { AdminCountryOrganizationSize } from "@repo/types";

export const adminCountryOrganizationSizeSelect = {
  id: true,
  countryId: true,
  name: true,
  description: true,
  position: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  createdById: true,
  updatedById: true,
  _count: {
    select: { organizationData: true },
  },
} satisfies Prisma.CountryOrganizationSizeSelect;

type SizeRow = Prisma.CountryOrganizationSizeGetPayload<{
  select: typeof adminCountryOrganizationSizeSelect;
}>;

export const mapCountryOrganizationSizeToAdmin = (
  row: SizeRow
): AdminCountryOrganizationSize => {
  const counts = row._count;
  return {
    id: row.id.toString(),
    countryId: row.countryId.toString(),
    name: row.name,
    description: row.description,
    position: row.position,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt ? row.updatedAt.toISOString() : null,
    createdById: row.createdById?.toString() ?? null,
    updatedById: row.updatedById?.toString() ?? null,
    isInUse: counts.organizationData > 0,
    impactedChildren: {
      organizationData: counts.organizationData,
    },
  };
};
