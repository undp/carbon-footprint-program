import type { PrismaClient } from "@repo/database";
import type { GetAllCarbonInventoriesResponse } from "@repo/types";
import { mapCarbonInventoryToResponse } from "../mappers.js";

export const getAllCarbonInventoriesService = async (
  prismaClient: PrismaClient
): Promise<GetAllCarbonInventoriesResponse> => {
  const data = await prismaClient.carbon_inventory.findMany({
    orderBy: {
      created_at: "desc",
    },
  });

  return data.map(mapCarbonInventoryToResponse);
};
