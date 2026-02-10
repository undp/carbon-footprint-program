import type { PrismaClient } from "@repo/database";
import type {
  GetCarbonInventoryMetadataResponse,
  OrganizationData,
} from "@repo/types";
import { CarbonInventoryNotFoundError } from "../errors.js";

export const getCarbonInventoryMetadataService = async (
  prismaClient: PrismaClient,
  id: string
): Promise<GetCarbonInventoryMetadataResponse> => {
  const inventory = await prismaClient.carbonInventory.findUnique({
    where: { id: BigInt(id) },
    select: {
      id: true,
      name: true,
      organizationData: true,
      methodologyVersionId: true,
    },
  });

  if (!inventory) {
    throw new CarbonInventoryNotFoundError(id);
  }

  const orgData = inventory.organizationData as OrganizationData | null;

  const sectorId = orgData?.sectorId ? String(orgData.sectorId) : null;
  const sizeId = orgData?.sizeId ? String(orgData.sizeId) : null;
  const mainActivityId = orgData?.mainActivityId
    ? String(orgData.mainActivityId)
    : null;

  const [sector, size, mainActivity, methodology] = await Promise.all([
    sectorId
      ? prismaClient.countrySector.findUnique({
          where: { id: BigInt(sectorId) },
          select: { name: true },
        })
      : null,
    sizeId
      ? prismaClient.countryOrganizationSize.findUnique({
          where: { id: BigInt(sizeId) },
          select: { name: true },
        })
      : null,
    mainActivityId
      ? prismaClient.organizationMainActivity.findUnique({
          where: { id: BigInt(mainActivityId) },
          select: { name: true },
        })
      : null,
    inventory.methodologyVersionId
      ? prismaClient.methodologyVersion.findUnique({
          where: { id: inventory.methodologyVersionId },
          select: { country: { select: { name: true } } },
        })
      : null,
  ]);

  return {
    id: inventory.id.toString(),
    name: inventory.name,
    country: methodology?.country.name ?? null,
    organizationName: typeof orgData?.name === "string" ? orgData.name : null,
    organizationBranchesQuantity: null,
    organizationSectorName: sector?.name ?? null,
    organizationSizeName: size?.name ?? null,
    organizationMainActivityName: mainActivity?.name ?? null,
    organizationMainActivityQuantity:
      typeof orgData?.mainActivityQuantity === "number"
        ? orgData.mainActivityQuantity
        : null,
  };
};
