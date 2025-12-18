import type { PrismaClient, Prisma } from "@repo/database";
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
      organization_id: data.organizationId ? BigInt(data.organizationId) : null,
      organization_branch_id: data.organizationBranchId
        ? BigInt(data.organizationBranchId)
        : null,
      organization_data: (data.organizationData ?? {}) as Prisma.InputJsonValue,
      year: data.year,
      status: "DRAFT", // Default status
      usage_mode: data.usageMode,
      methodology_version_id: data.methodologyVersionId
        ? BigInt(data.methodologyVersionId)
        : null,
      preselected_nodes_id: data.preselectedNodesId
        ? BigInt(data.preselectedNodesId)
        : null,
      is_editable: true, // Default to editable
    },
  });
  return mapCarbonInventoryToResponse(item);
};
