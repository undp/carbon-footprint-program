import { OrganizationDataStatus, type PrismaClient } from "@repo/database";
import type { GetMyOrganizationsResponse } from "@repo/types";

export const getMyOrganizationsService = async (
  prismaClient: PrismaClient
): Promise<GetMyOrganizationsResponse> => {
  const organizations = await prismaClient.organization.findMany({
    include: {
      data: {
        where: {
          status: {
            in: [
              OrganizationDataStatus.COMPLETED,
              OrganizationDataStatus.DRAFT,
              OrganizationDataStatus.SUBMITTED,
            ],
          },
        },
        orderBy: [{ status: "asc" }, { id: "desc" }],
      },
    },
  });
  // 3. Map to response format with computed label
  return organizations.map((organization) => ({
    id: organization.id.toString(),
    name:
      organization.data[0].tradeName ||
      organization.data[0].legalName ||
      organization.data[0].taxId ||
      "N/A",
  }));
};
