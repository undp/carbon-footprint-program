import type { carbon_inventory } from "@repo/database";
import type {
  GetCarbonInventoryByIdResponse,
  OrganizationData,
} from "@repo/types";

export const mapCarbonInventoryToResponse = (
  item: carbon_inventory
): GetCarbonInventoryByIdResponse => {
  return {
    id: item.id.toString(),
    organizationId: item.organization_id?.toString() ?? null,
    organizationBranchId: item.organization_branch_id?.toString() ?? null,
    organizationData:
      (item.organization_data as OrganizationData | null) ?? null,
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
