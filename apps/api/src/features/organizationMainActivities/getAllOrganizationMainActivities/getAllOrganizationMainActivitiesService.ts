import type { PrismaClient } from "@repo/database";
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
    country_sector_id?: bigint | null;
    country_subsector_id?: bigint | null;
  }> = [];

  // Always include generic activities (double NULL)
  orConditions.push({
    country_sector_id: null,
    country_subsector_id: null,
  });

  // Add filter-specific conditions (generic activities already added above)
  if (filters?.sectorId && !filters?.subsectorId) {
    // Only sectorId is provided
    orConditions.push({
      country_sector_id: BigInt(filters.sectorId),
    });
  } else if (filters?.sectorId && filters?.subsectorId) {
    // Both sectorId and subsectorId are provided
    orConditions.push({
      country_sector_id: BigInt(filters.sectorId),
      country_subsector_id: BigInt(filters.subsectorId),
    });
  }
  // If no filters, only generic activities are returned (already in orConditions)

  const data = await prismaClient.organization_main_activity.findMany({
    where: {
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
