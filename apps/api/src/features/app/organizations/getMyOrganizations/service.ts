import { OrganizationDataStatus, type PrismaClient } from "@repo/database";
import type { GetMyOrganizationsResponse } from "@repo/types";

export const getMyOrganizationsService = async (
  prismaClient: PrismaClient
): Promise<GetMyOrganizationsResponse> => {
  const organizations = await prismaClient.organization.findMany({
    include: {
      data: true,
    },
  });

  // 3. Map to response format with computed label
  return organizations.map((org) => {
    const priorityMap: Record<OrganizationDataStatus, number> = {
      [OrganizationDataStatus.COMPLETED]: 1,
      [OrganizationDataStatus.SUBMITTED]: 2,
      [OrganizationDataStatus.DRAFT]: 3,
      [OrganizationDataStatus.REJECTED]: 4,
      [OrganizationDataStatus.OUTDATED]: 5, // for type safety
    };
    const sortedData = org.data.sort(
      (a, b) =>
        priorityMap[a.status] - priorityMap[b.status] || Number(b.id - a.id)
    );

    return {
      id: org.id.toString(),
      name:
        sortedData[0].tradeName ||
        sortedData[0].legalName ||
        sortedData[0].taxId ||
        "N/A",
    };
  });
};
