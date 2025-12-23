import { type PrismaClient, Prisma } from "@repo/database";
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
      year: null,
      status: "DRAFT", // Default status
      usage_mode: data.usageMode,
      is_editable: true, // Default to editable
      organization_id: null,
      organization_branch_id: null,
      organization_data: Prisma.JsonNull,
      methodology_version_id: null,
      preselected_nodes_id: null,
      created_by_id: null, // TODO: Add created by id from logged in user
      updated_by_id: null, // TODO: Add updated by id from logged in user
    },
  });
  return mapCarbonInventoryToResponse(item);
};
