import { type PrismaClient, InventoryStatus, Prisma } from "@repo/database";
import type { User } from "@repo/types";
import { CarbonInventoryNotFoundError } from "../errors.js";
import {
  carbonInventoryWithSubmissionsMinimalSelect,
  calculateDisplayStatus,
} from "../helpers.js";
import { CarbonInventoryDisplayStatusEnum } from "@repo/types";

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

  const cannotDelete =
    displayStatus ===
      CarbonInventoryDisplayStatusEnum.SUBMITTED_TO_CALCULATION ||
    displayStatus ===
      CarbonInventoryDisplayStatusEnum.SUBMITTED_TO_VERIFICATION ||
    displayStatus === CarbonInventoryDisplayStatusEnum.VERIFICATION_APPROVED;

  if (cannotDelete) {
    throw new CarbonInventoryNotDeletableError(id, displayStatus);
  }

  try {
    await prismaClient.carbonInventory.update({
      where: { id: BigInt(id) },
      data: {
        status: InventoryStatus.DELETED,
        updatedById: user ? BigInt(user.id) : null,
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") {
        throw new CarbonInventoryNotFoundError(id);
      }
    }
    throw error;
  }
};

import createError from "@fastify/error";

const CarbonInventoryNotDeletableError = createError(
  "CARBON_INVENTORY_NOT_DELETABLE",
  "Carbon inventory %s cannot be deleted in its current status (%s)",
  403
);
