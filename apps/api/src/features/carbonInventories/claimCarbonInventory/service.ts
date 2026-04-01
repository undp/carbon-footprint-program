import { type PrismaClient } from "@repo/database";
import type { User } from "@repo/types";
import {
  CarbonInventoryNotFoundError,
  CarbonInventoryAlreadyClaimedError,
  CarbonInventoryInvalidUuidError,
} from "../errors.js";

export const claimCarbonInventoryService = async (
  prismaClient: PrismaClient,
  id: string,
  uuid: string,
  user: User
): Promise<void> => {
  const inventory = await prismaClient.carbonInventory.findUnique({
    where: { id: BigInt(id) },
    select: {
      uuid: true,
      createdById: true,
      organizationId: true,
      status: true,
    },
  });

  if (!inventory || inventory.status === "DELETED") {
    throw new CarbonInventoryNotFoundError(id);
  }

  if (inventory.uuid !== uuid) {
    throw new CarbonInventoryInvalidUuidError(id);
  }

  if (inventory.createdById !== null || inventory.organizationId !== null) {
    throw new CarbonInventoryAlreadyClaimedError(id);
  }

  await prismaClient.carbonInventory.update({
    where: { id: BigInt(id) },
    data: {
      createdById: BigInt(user.id),
      updatedById: BigInt(user.id),
    },
  });
};
