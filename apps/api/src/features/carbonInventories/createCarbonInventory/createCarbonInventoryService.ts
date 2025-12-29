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
  // Find the first available methodology version (status: ENTITY/ACTIVE)
  const availableMethodology = await prismaClient.methodology_version.findFirst(
    {
      where: {
        status: {
          scope: "ENTITY",
          code: "ACTIVE",
        },
      },
      orderBy: {
        id: "asc",
      },
      select: {
        id: true,
      },
    }
  );

  if (!availableMethodology) {
    throw new Error(
      "No available methodology version found. Please ensure at least one methodology version with ACTIVE status exists."
    );
  }

  const item = await prismaClient.carbon_inventory.create({
    data: {
      usage_mode: data.usageMode,
      methodology_version_id: availableMethodology.id,
      created_by_id: null, // TODO: Add created by id from logged in user
      updated_by_id: null, // TODO: Add updated by id from logged in user
    },
  });
  return mapCarbonInventoryToResponse(item);
};
