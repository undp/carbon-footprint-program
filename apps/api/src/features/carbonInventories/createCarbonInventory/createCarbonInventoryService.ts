import type { PrismaClient, Prisma } from "@repo/database";
import type {
  CreateCarbonInventoryRequest,
  CreateCarbonInventoryResponse,
} from "@repo/types";

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
      organization_data: data.organizationData as Prisma.InputJsonValue,
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

  return {
    id: item.id.toString(),
    organizationId: item.organization_id?.toString() ?? null,
    organizationBranchId: item.organization_branch_id?.toString() ?? null,
    organizationData: item.organization_data as Record<string, unknown>,
    year: item.year,
    status: item.status,
    usageMode: item.usage_mode,
    methodologyVersionId: item.methodology_version_id?.toString() ?? null,
    preselectedNodesId: item.preselected_nodes_id?.toString() ?? null,
    isEditable: item.is_editable,
    createdAt: item.created_at.toISOString(),
    updatedAt: item.updated_at.toISOString(),
    createdById: item.created_by_id?.toString() ?? null,
    updatedById: item.updated_by_id?.toString() ?? null,
  };
};
