import type { PrismaClient } from "@repo/database";
import {
  type GetCarbonInventoryByIdResponse,
  CarbonInventoryLineStatus,
} from "@repo/types";
import { mapCarbonInventoryWithLinesToResponse } from "../mappers.js";

export const getCarbonInventoryByIdService = async (
  prismaClient: PrismaClient,
  id: string
): Promise<GetCarbonInventoryByIdResponse | null> => {
  const inventory = await prismaClient.carbonInventory.findUnique({
    where: {
      id: BigInt(id),
    },
    include: {
      lines: {
        where: {
          status: CarbonInventoryLineStatus.ACTIVE,
        },
        include: {
          inputs: {
            where: {
              isActive: true,
            },
            include: {
              factor: true,
            },
            take: 1, // Only get the active input
          },
        },
      },
    },
  });

  if (!inventory) return null;

  return mapCarbonInventoryWithLinesToResponse(inventory);
};
