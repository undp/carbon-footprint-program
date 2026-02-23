import { CarbonInventorySchema } from "../baseSchemas.js";

export const UpdateCarbonInventoryRequestSchema = CarbonInventorySchema.pick({
  name: true,
  organizationId: true,
  organizationBranchId: true,
  organizationData: true,
  year: true,
  usageMode: true,
  preselectedNodesId: true,
  status: true,
  isEditable: true,
}).partial();

export const UpdateCarbonInventoryResponseSchema = CarbonInventorySchema.omit({
  subcategories: true,
});
