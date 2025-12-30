import { type PrismaClient, Prisma } from "@repo/database";
import type {
  UpdateCarbonInventoryRequest,
  UpdateCarbonInventoryResponse,
} from "@repo/types";
import { mapCarbonInventoryToResponse } from "../mappers.js";
import { mapBigIntField } from "@/utils/bigint.js";

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

  const organizationId = mapBigIntField(data.organizationId);
  if (organizationId !== undefined) {
    updateData.organization_id = organizationId;
  }

  const organizationBranchId = mapBigIntField(data.organizationBranchId);
  if (organizationBranchId !== undefined) {
    updateData.organization_branch_id = organizationBranchId;
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

  // methodology_version_id cannot be updated via PATCH endpoint
  // It is set only during creation and remains immutable

  const preselectedNodesId = mapBigIntField(data.preselectedNodesId);
  if (preselectedNodesId !== undefined) {
    updateData.preselected_nodes_id = preselectedNodesId;
  }

  if (data.status !== undefined) {
    updateData.status = data.status;
  }

  if (data.isEditable !== undefined) {
    updateData.is_editable = data.isEditable;
  }

  // Only set updated_by_id if there are actual fields to update
  // TODO: Replace null with actual logged-in user ID when auth is implemented
  if (Object.keys(updateData).length > 0) {
    updateData.updated_by_id = null;
  }

  const item = await prismaClient.carbon_inventory.update({
    where: { id: BigInt(id) },
    data: updateData,
  });

  return mapCarbonInventoryToResponse(item);
};
