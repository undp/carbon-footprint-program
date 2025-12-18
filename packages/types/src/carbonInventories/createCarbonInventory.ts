import { z } from "zod";
import { CarbonInventorySchema } from "./base.js";

export const CreateCarbonInventoryRequestSchema = CarbonInventorySchema.pick({
  organizationId: true,
  organizationBranchId: true,
  organizationData: true,
  year: true,
  usageMode: true,
  methodologyVersionId: true,
  preselectedNodesId: true,
}).partial();

export const CreateCarbonInventoryResponseSchema = CarbonInventorySchema;

// TypeScript Types
export type CreateCarbonInventoryRequest = z.infer<
  typeof CreateCarbonInventoryRequestSchema
>;

export type CreateCarbonInventoryResponse = z.infer<
  typeof CreateCarbonInventoryResponseSchema
>;
