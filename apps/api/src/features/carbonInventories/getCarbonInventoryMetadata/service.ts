import type { PrismaClient } from "@repo/database";
import type { GetCarbonInventoryMetadataResponse } from "@repo/types";
import { CarbonInventoryNotFoundError } from "../errors.js";
import { safeParseCarbonInventoryOrganizationData } from "../utils.js";
import {
  calculateDisplayStatus,
  carbonInventoryWithSubmissionsMinimalSelect,
} from "../helpers.js";

export const getCarbonInventoryMetadataService = async (
  prismaClient: PrismaClient,
  id: string
): Promise<GetCarbonInventoryMetadataResponse> => {
  const inventory = await prismaClient.carbonInventory.findUnique({
    where: { id: BigInt(id) },
    select: {
      name: true,
      year: true,
      organizationData: true,
      methodologyVersionId: true,
      organization: {
        select: {
          summary: { select: { name: true } },
        },
      },
      ...carbonInventoryWithSubmissionsMinimalSelect,
    },
  });

  if (!inventory) {
    throw new CarbonInventoryNotFoundError(id);
  }

  const orgData = safeParseCarbonInventoryOrganizationData(
    id,
    inventory.organizationData
  );

  const sectorId = orgData?.sectorId ?? null;
  const subsectorId = orgData?.subsectorId ?? null;
  const sizeId = orgData?.sizeId ?? null;
  const mainActivityId = orgData?.mainActivityId ?? null;

  const [sector, subsector, size, mainActivity, methodology] =
    await Promise.all([
      sectorId
        ? prismaClient.countrySector.findUnique({
            where: { id: BigInt(sectorId) },
            select: { name: true },
          })
        : null,
      subsectorId
        ? prismaClient.countrySubsector.findUnique({
            where: { id: BigInt(subsectorId) },
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
    year: inventory.year,
    country: methodology?.country.name ?? null,
    organizationName:
      inventory.organization?.summary?.name || orgData?.name || null,
    organizationSectorName: sector?.name ?? null,
    organizationSubsectorName: subsector?.name ?? null,
    organizationSizeName: size?.name ?? null,
    organizationMainActivityName: mainActivity?.name ?? null,
    organizationMainActivityQuantity: orgData?.mainActivityQuantity ?? null,
    status: calculateDisplayStatus(inventory),
  };
};
