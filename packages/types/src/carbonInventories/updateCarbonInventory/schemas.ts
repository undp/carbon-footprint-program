import { CarbonInventoryBaseSchema } from "../../baseSchemas/index.js";

export const UpdateCarbonInventoryRequestSchema =
  CarbonInventoryBaseSchema.pick({
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

export const UpdateCarbonInventoryResponseSchema = CarbonInventoryBaseSchema;
