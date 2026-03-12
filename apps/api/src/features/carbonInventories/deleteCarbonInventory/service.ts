import { type PrismaClient, InventoryStatus } from "@repo/database";
import type { User } from "@repo/types";
import {
  CarbonInventoryNotDeletableError,
  CarbonInventoryNotFoundError,
} from "../errors.js";
import {
  carbonInventoryWithSubmissionsMinimalSelect,
  calculateDisplayStatus,
} from "../helpers.js";
import { isCarbonInventoryDeletable } from "@repo/utils";

export const deleteCarbonInventoryService = async (
  prismaClient: PrismaClient,
  id: string,
  user: User | null
): Promise<void> => {
  const inventory = await prismaClient.carbonInventory.findUnique({
    where: { id: BigInt(id) },
    select: {
      ...carbonInventoryWithSubmissionsMinimalSelect,
    },
  });

  if (!inventory) {
    throw new CarbonInventoryNotFoundError(id);
  }

  const displayStatus = calculateDisplayStatus(inventory);

  const canDelete = isCarbonInventoryDeletable(displayStatus);
  if (!canDelete) throw new CarbonInventoryNotDeletableError(id, displayStatus);

  await prismaClient.carbonInventory.update({
    where: { id: BigInt(id) },
    data: {
      status: InventoryStatus.DELETED,
      updatedById: user ? BigInt(user.id) : null,
    },
  });
};
