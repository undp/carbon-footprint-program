import type { PrismaClient } from "@repo/database";
import { MembershipStatus } from "@repo/database/enums";
import type { GetCarbonInventoryMetadataResponse } from "@repo/types";
import { CarbonInventoryNotFoundError } from "../errors.js";
import { safeParseCarbonInventoryOrganizationData } from "../utils.js";
import {
  calculateDisplayStatus,
  carbonInventoryWithSubmissionsMinimalSelect,
  resolveCarbonInventoryEditAccess,
} from "../helpers.js";

// Sentinel that never matches a real userId; lets us keep the membership
// include in the same query when the request is anonymous (userId is null).
const NO_USER_ID = -1n;

export const getCarbonInventoryMetadataService = async (
  prismaClient: PrismaClient,
  id: string,
  userId: bigint | null
): Promise<GetCarbonInventoryMetadataResponse> => {
  const inventory = await prismaClient.carbonInventory.findUnique({
    where: { id: BigInt(id) },
    select: {
      name: true,
      createdById: true,
      organizationId: true,
      organizationData: true,
      methodologyVersionId: true,
      organization: {
        select: {
          summary: { select: { name: true } },
          memberships: {
            where: {
              userId: userId ?? NO_USER_ID,
              status: MembershipStatus.ACTIVE,
            },
            select: { role: true },
            take: 1,
          },
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
  const sizeId = orgData?.sizeId ?? null;
  const mainActivityId = orgData?.mainActivityId ?? null;

  const status = calculateDisplayStatus(inventory);

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

  const canEdit = resolveCarbonInventoryEditAccess(
    {
      createdById: inventory.createdById,
      organizationId: inventory.organizationId,
      status,
    },
    userId,
    inventory.organization?.memberships ?? []
  );

  return {
    id: inventory.id.toString(),
    name: inventory.name,
    country: methodology?.country.name ?? null,
    organizationName:
      inventory.organization?.summary?.name || orgData?.name || null,
    organizationBranchesQuantity: null,
    organizationSectorName: sector?.name ?? null,
    organizationSizeName: size?.name ?? null,
    organizationMainActivityName: mainActivity?.name ?? null,
    organizationMainActivityQuantity: orgData?.mainActivityQuantity ?? null,
    status,
    canEdit,
  };
};
