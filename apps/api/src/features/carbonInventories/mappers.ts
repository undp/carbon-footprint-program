import type { CarbonInventory } from "@repo/database";
import type { GetCarbonInventoryByIdResponse } from "@repo/types";
import { OrganizationDataSchema } from "@repo/types";
import { DataIntegrityError } from "@/errors/index.js";

export const mapCarbonInventoryToResponse = (
  item: CarbonInventory
): GetCarbonInventoryByIdResponse => {
  // Validate organizationData with runtime type checking using Zod
  const organizationDataResult = OrganizationDataSchema.nullable().safeParse(
    item.organizationData
  );

  if (!organizationDataResult.success)
    throw new DataIntegrityError(
      `Invalid organizationData structure for carbon inventory ${item.id}: ${organizationDataResult.error.message}`
    );

  return {
    id: item.id.toString(),
    organizationId: item.organizationId?.toString() ?? null,
    organizationBranchId: item.organizationBranchId?.toString() ?? null,
    organizationData: organizationDataResult.data,
    year: item.year,
    status: item.status,
    usageMode: item.usageMode,
    methodologyVersionId: item.methodologyVersionId?.toString() ?? null,
    preselectedNodesId: item.preselectedNodesId?.toString() ?? null,
    isEditable: item.isEditable,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
    createdById: item.createdById?.toString() ?? null,
    updatedById: item.updatedById?.toString() ?? null,
  };
};
