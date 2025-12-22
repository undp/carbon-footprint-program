import { type PrismaClient, Prisma } from "@repo/database";
import type {
  UpdateCarbonInventoryRequest,
  UpdateCarbonInventoryResponse,
} from "@repo/types";
import { mapCarbonInventoryToResponse } from "../mappers.js";

export const updateCarbonInventoryService = async (
  prismaClient: PrismaClient,
  id: string,
  data: UpdateCarbonInventoryRequest
): Promise<UpdateCarbonInventoryResponse | null> => {
  // Check if the inventory exists
  const existingInventory = await prismaClient.carbon_inventory.findUnique({
    where: { id: BigInt(id) },
  });

  if (!existingInventory) {
    return null;
  }

  // Build the update data object dynamically based on provided fields
  const updateData: Prisma.carbon_inventoryUncheckedUpdateInput = {};

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

  if (data.status !== undefined) {
    updateData.status = data.status;
  }

  if (data.isEditable !== undefined) {
    updateData.is_editable = data.isEditable;
  }

  // TODO: Add updated by id from logged in user
  updateData.updated_by_id = null;

  const item = await prismaClient.carbon_inventory.update({
    where: { id: BigInt(id) },
    data: updateData,
  });

  return mapCarbonInventoryToResponse(item);
};
