import { type PrismaClient } from "@repo/database";
import { type OrganizationDataField } from "@repo/types";

export const buildOrganizationDataSnapshot = async (
  prismaClient: PrismaClient,
  organizationId: string
): Promise<OrganizationDataField | null> => {
  const summary = await prismaClient.organizationSummaryView.findUnique({
    where: { organizationId: BigInt(organizationId) },
    select: {
      name: true,
      organizationData: {
        select: {
          sectorId: true,
          subsectorId: true,
          countryOrganizationSizeId: true,
          mainActivityId: true,
        },
      },
    },
  });

  if (!summary) return null;

  const od = summary.organizationData;
  return {
    name: summary.name,
    sectorId: od.sectorId?.toString() ?? null,
    subsectorId: od.subsectorId?.toString() ?? null,
    sizeId: od.countryOrganizationSizeId?.toString() ?? null,
    mainActivityId: od.mainActivityId?.toString() ?? null,
    mainActivityQuantity: null,
  };
};
