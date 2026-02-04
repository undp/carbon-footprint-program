import { type PrismaClient } from "@repo/database";
import {
  type CreateCarbonInventoryRequest,
  type CreateCarbonInventoryResponse,
  MethodologyVersionStatus,
} from "@repo/types";
import { mapCarbonInventoryToResponse } from "../mappers.js";

export type CreateCarbonInventoryResult =
  | { success: true; data: CreateCarbonInventoryResponse }
  | {
      success: false;
      error: { code: "NO_ACTIVE_METHODOLOGY"; message: string };
    };

export const createCarbonInventoryService = async (
  prismaClient: PrismaClient,
  data: CreateCarbonInventoryRequest
): Promise<CreateCarbonInventoryResult> => {
  // Find the first methodology version with status MethodologyVersionStatus.ACTIVE
  const availableMethodology = await prismaClient.methodologyVersion.findFirst({
    where: {
      status: MethodologyVersionStatus.ACTIVE,
    },
    orderBy: {
      id: "asc",
    },
    select: {
      id: true,
    },
  });

  if (!availableMethodology) {
    return {
      success: false,
      error: {
        code: "NO_ACTIVE_METHODOLOGY",
        message: "No active methodology version found",
      },
    };
  }

  const item = await prismaClient.carbonInventory.create({
    data: {
      usageMode: data.usageMode,
      methodologyVersionId: availableMethodology.id,
      createdById: null, // TODO: Add created by id from logged in user
      updatedById: null, // TODO: Add updated by id from logged in user
    },
  });
  return {
    success: true,
    data: mapCarbonInventoryToResponse(item),
  };
};
