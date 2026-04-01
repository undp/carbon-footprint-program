import { InventoryStatus, type PrismaClient } from "@repo/database";
import type { User } from "@repo/types";
import { CarbonInventoryNotFoundError } from "../errors.js";

export const claimCarbonInventoryService = async (
  prismaClient: PrismaClient,
  id: string,
  uuid: string,
  user: User
): Promise<void> => {
  const inventory = await prismaClient.carbonInventory.findUnique({
    where: { id: BigInt(id), status: InventoryStatus.ACTIVE },
    select: {
      uuid: true,
      createdById: true,
      organizationId: true,
      status: true,
    },
  });

  // Treat "not found" and "uuid mismatch" identically to prevent ID enumeration.
  // An attacker scanning sequential IDs must not be able to distinguish between
  // a non-existent inventory and one they simply don't own.
  if (
    !inventory ||
    inventory.uuid !== uuid ||
    inventory.createdById !== null ||
    inventory.organizationId !== null
  ) {
    throw new CarbonInventoryNotFoundError(id);
  }

  await prismaClient.carbonInventory.update({
    where: { id: BigInt(id) },
    data: {
      createdById: BigInt(user.id),
      updatedById: BigInt(user.id),
    },
  });
};
