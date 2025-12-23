import { type PrismaClient } from "@repo/database";
import type {
  CreateCarbonInventoryRequest,
  CreateCarbonInventoryResponse,
} from "@repo/types";
import { mapCarbonInventoryToResponse } from "../mappers.js";

export const createCarbonInventoryService = async (
  prismaClient: PrismaClient,
  data: CreateCarbonInventoryRequest
): Promise<CreateCarbonInventoryResponse> => {
  const item = await prismaClient.carbon_inventory.create({
    data: {
      usage_mode: data.usageMode,
      created_by_id: null, // TODO: Add created by id from logged in user
      updated_by_id: null, // TODO: Add updated by id from logged in user
    },
  });
  return mapCarbonInventoryToResponse(item);
};
