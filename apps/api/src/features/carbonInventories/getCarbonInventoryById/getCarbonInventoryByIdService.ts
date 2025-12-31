import type { PrismaClient } from "@repo/database";
import type { GetCarbonInventoryByIdResponse } from "@repo/types";
import { mapCarbonInventoryToResponse } from "../mappers.js";

export const getCarbonInventoryByIdService = async (
  prismaClient: PrismaClient,
  id: string
): Promise<GetCarbonInventoryByIdResponse | null> => {
  const item = await prismaClient.carbonInventory.findUnique({
    where: {
      id: BigInt(id),
    },
  });

  if (!item) return null;

  return mapCarbonInventoryToResponse(item);
};
