import { CountryOrganizationSizeStatus } from "@repo/database";
import type { AdminCountryOrganizationSize } from "@repo/types";

type SizeRow = {
  id: bigint;
  countryId: bigint;
  name: string;
  description: string | null;
  status: CountryOrganizationSizeStatus;
  createdAt: Date;
  updatedAt: Date | null;
  createdById: bigint | null;
  updatedById: bigint | null;
  _count?: { organizationData: number };
};

export const mapCountryOrganizationSizeToAdmin = (
  row: SizeRow
): AdminCountryOrganizationSize => {
  const counts = row._count ?? { organizationData: 0 };
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
    isInUse: counts.organizationData > 0,
  };
};

export const adminCountryOrganizationSizeSelect = {
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
    select: { organizationData: true },
  },
} as const;
