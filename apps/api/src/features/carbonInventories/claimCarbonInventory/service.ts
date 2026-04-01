import { InventoryStatus, type PrismaClient } from "@repo/database";
import type { User } from "@repo/types";
import { CarbonInventoryNotFoundError } from "../errors.js";

export const claimCarbonInventoryService = async (
  prismaClient: PrismaClient,
  id: string,
  uuid: string,
  user: User
): Promise<void> => {
  const { count } = await prismaClient.carbonInventory.updateMany({
    where: {
      id: BigInt(id),
      status: InventoryStatus.ACTIVE,
      uuid: uuid,
      createdById: null,
      organizationId: null,
    },
    data: {
      createdById: BigInt(user.id),
    },
  });

  // Treat "not found" and "uuid mismatch" identically to prevent ID enumeration.
  // An attacker scanning sequential IDs must not be able to distinguish between
  // a non-existent inventory and one they simply don't own.
  if (count === 0) {
    throw new CarbonInventoryNotFoundError(id);
  }
};
