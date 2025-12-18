import type { carbon_inventory } from "@repo/database";
import type { GetCarbonInventoryByIdResponse } from "@repo/types";
import { OrganizationDataSchema } from "@repo/types";
import { DataIntegrityError } from "@/errors/index.js";

export const mapCarbonInventoryToResponse = (
  item: carbon_inventory
): GetCarbonInventoryByIdResponse => {
  // Validate organization_data with runtime type checking using Zod
  const organizationDataResult = OrganizationDataSchema.nullable().safeParse(
    item.organization_data
  );

  if (!organizationDataResult.success)
    throw new DataIntegrityError(
      `Invalid organization_data structure for carbon inventory ${item.id}: ${organizationDataResult.error.message}`
    );

  return {
    id: item.id.toString(),
    organizationId: item.organization_id?.toString() ?? null,
    organizationBranchId: item.organization_branch_id?.toString() ?? null,
    organizationData: organizationDataResult.data,
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
