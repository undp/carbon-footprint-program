import type { PrismaClient } from "@repo/database";
import { OrganizationStatus } from "@repo/database";
import type { GetOrganizationKpisResponse } from "@repo/types";

export const getOrganizationKpisService = async (
  prismaClient: PrismaClient
): Promise<GetOrganizationKpisResponse> => {
  // Fetch all organizations from the summary view
  const organizations = await prismaClient.organizationSummaryView.findMany({
    select: {
      organizationStatus: true,
      isAccredited: true,
      hasCarbonInventories: true,
    },
  });

  // Initialize all valid combinations with count 0
  const countMap = new Map<string, number>();
  const statuses: Array<OrganizationStatus> = [
    OrganizationStatus.ACTIVE,
    OrganizationStatus.BLOCKED,
  ];
  const booleanValues = [true, false];

  for (const status of statuses) {
    for (const accredited of booleanValues) {
      for (const withInventories of booleanValues) {
        const key = `${status}-${accredited}-${withInventories}`;
        countMap.set(key, 0);
      }
    }
  }

  // Count actual organizations
  for (const org of organizations) {
    const key = `${org.organizationStatus}-${org.isAccredited}-${org.hasCarbonInventories}`;
    countMap.set(key, (countMap.get(key) || 0) + 1);
  }

  // Convert to response format
  const counts = Array.from(countMap.entries()).map(([key, count]) => {
    const [status, accredited, withInventories] = key.split("-");
    return {
      status: status as OrganizationStatus,
      accredited: accredited === "true",
      withInventories: withInventories === "true",
      count,
    };
  });

  return {
    total: organizations.length,
    counts,
  };
};
