import {
  type PrismaClient,
  OrganizationMainActivityStatus,
} from "@repo/database";
import type {
  GetAllOrganizationMainActivitiesResponse,
  GetAllOrganizationMainActivitiesQuery,
} from "@repo/types";

export const getAllOrganizationMainActivitiesService = async (
  prismaClient: PrismaClient,
  filters?: GetAllOrganizationMainActivitiesQuery
): Promise<GetAllOrganizationMainActivitiesResponse> => {
  // Build OR conditions based on filters
  // We always want to include generic activities (both sector and subsector are NULL)
  const orConditions: Array<{
    countrySectorId?: bigint | null;
    countrySubsectorId?: bigint | null;
  }> = [];

  // Always include generic activities (double NULL)
  orConditions.push({
    countrySectorId: null,
    countrySubsectorId: null,
  });

  // Add filter-specific conditions (generic activities already added above)
  if (filters?.sectorId) {
    // Add sector-specific activities
    orConditions.push({
      countrySectorId: BigInt(filters.sectorId),
    });
  }

  if (filters?.subsectorId) {
    // Add subsector-specific activities
    orConditions.push({
      countrySubsectorId: BigInt(filters.subsectorId),
    });
  }

  const data = await prismaClient.organizationMainActivity.findMany({
    where: {
      status: OrganizationMainActivityStatus.ACTIVE,
      OR: orConditions,
    },
    orderBy: {
      name: "asc",
    },
  });

  return data.map((item) => ({
    id: item.id.toString(),
    name: item.name,
  }));
};
