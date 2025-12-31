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
  const existingInventory = await prismaClient.carbonInventory.findUnique({
    where: { id: BigInt(id) },
  });

  if (!existingInventory) {
    return null;
  }

  // Build the update data object dynamically based on provided fields
  const updateData: Prisma.CarbonInventoryUncheckedUpdateInput = {};

  const organizationId = mapBigIntField(data.organizationId);
  if (organizationId !== undefined) {
    updateData.organizationId = organizationId;
  }

  const organizationBranchId = mapBigIntField(data.organizationBranchId);
  if (organizationBranchId !== undefined) {
    updateData.organizationBranchId = organizationBranchId;
  }

  if (data.organizationData !== undefined) {
    updateData.organizationData = data.organizationData
      ? (data.organizationData as Prisma.InputJsonValue)
      : Prisma.JsonNull;
  }

  if (data.year !== undefined) {
    updateData.year = data.year;
  }

  if (data.usageMode !== undefined) {
    updateData.usageMode = data.usageMode;
  }

  // methodologyVersionId cannot be updated via PATCH endpoint
  // It is set only during creation and remains immutable

  const preselectedNodesId = mapBigIntField(data.preselectedNodesId);
  if (preselectedNodesId !== undefined) {
    updateData.preselectedNodesId = preselectedNodesId;
  }

  if (data.status !== undefined) {
    updateData.status = data.status;
  }

  if (data.isEditable !== undefined) {
    updateData.isEditable = data.isEditable;
  }

  // Only set updatedById if there are actual fields to update
  // TODO: Replace null with actual logged-in user ID when auth is implemented
  if (Object.keys(updateData).length > 0) {
    updateData.updatedById = null;
  }

  const item = await prismaClient.carbonInventory.update({
    where: { id: BigInt(id) },
    data: updateData,
  });

  return mapCarbonInventoryToResponse(item);
};
