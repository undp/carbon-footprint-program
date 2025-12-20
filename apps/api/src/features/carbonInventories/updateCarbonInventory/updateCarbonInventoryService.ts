import { Prisma, type PrismaClient } from "@repo/database";
import type {
  UpdateCarbonInventoryRequest,
  UpdateCarbonInventoryResponse,
} from "@repo/types";
import { mapCarbonInventoryToResponse } from "../mappers.js";

export const updateCarbonInventoryService = async (
  prismaClient: PrismaClient,
  id: string,
  data: UpdateCarbonInventoryRequest
): Promise<UpdateCarbonInventoryResponse> => {
  const updateData: Prisma.carbon_inventoryUpdateInput = {};

  if (data.organizationId !== undefined) {
    updateData.organization_id = data.organizationId
      ? BigInt(data.organizationId)
      : null;
  }

  if (data.organizationBranchId !== undefined) {
    updateData.organization_branch_id = data.organizationBranchId
      ? BigInt(data.organizationBranchId)
      : null;
  }

  if (data.organizationData !== undefined) {
    updateData.organization_data = data.organizationData
      ? (data.organizationData as Prisma.InputJsonValue)
      : Prisma.JsonNull;
  }

  if (data.year !== undefined) {
    updateData.year = data.year;
  }

  if (data.usageMode !== undefined) {
    updateData.usage_mode = data.usageMode;
  }

  if (data.methodologyVersionId !== undefined) {
    updateData.methodology_version_id = data.methodologyVersionId
      ? BigInt(data.methodologyVersionId)
      : null;
  }

  if (data.preselectedNodesId !== undefined) {
    updateData.preselected_nodes_id = data.preselectedNodesId
      ? BigInt(data.preselectedNodesId)
      : null;
  }

  const item = await prismaClient.carbon_inventory.update({
    where: { id: BigInt(id) },
    data: updateData,
  });

  return mapCarbonInventoryToResponse(item);
};

