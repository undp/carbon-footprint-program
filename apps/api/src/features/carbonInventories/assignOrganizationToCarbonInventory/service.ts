import type { PrismaClient } from "@repo/database";
import type { User } from "@repo/types";
import {
  CarbonInventoryAlreadyHasOrganizationError,
  CarbonInventoryNotFoundError,
} from "../errors.js";
import {
  carbonInventoryWithSubmissionsMinimalSelect,
  validateCarbonInventoryIsEditable,
} from "../helpers.js";

export const assignOrganizationToCarbonInventoryService = async (
  prismaClient: PrismaClient,
  id: string,
  organizationId: string,
  user: User
): Promise<void> => {
  await prismaClient.$transaction(async (tx) => {
    const inventory = await tx.carbonInventory.findUnique({
      where: { id: BigInt(id) },
      select: {
        ...carbonInventoryWithSubmissionsMinimalSelect,
        organizationId: true,
      },
    });

    if (!inventory) {
      throw new CarbonInventoryNotFoundError(id);
    }

    if (inventory.organizationId !== null) {
      throw new CarbonInventoryAlreadyHasOrganizationError(id);
    }

    validateCarbonInventoryIsEditable(inventory);

    await tx.carbonInventory.update({
      where: { id: inventory.id },
      data: {
        organizationId: BigInt(organizationId),
        updatedById: BigInt(user.id),
      },
    });
  });
};
