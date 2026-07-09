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
      organizationData: true,
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

export const mapCountrySubsectorToAdmin = (
  row: CountrySubsectorRow
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
      organizationData: counts.organizationData,
      subcategoryRecommendations: counts.subcategoryRecommendations,
    },
  };
};
