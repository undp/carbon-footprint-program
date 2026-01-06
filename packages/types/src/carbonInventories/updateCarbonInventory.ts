import { z } from "zod";
import { CarbonInventorySchema } from "./base.js";

export const UpdateCarbonInventoryRequestSchema = CarbonInventorySchema.pick({
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

// TypeScript Types
export type UpdateCarbonInventoryRequest = z.infer<
  typeof UpdateCarbonInventoryRequestSchema
>;

export type UpdateCarbonInventoryResponse = z.infer<
  typeof UpdateCarbonInventoryResponseSchema
>;
