import { z } from "zod";
import { CarbonInventorySchema } from "./base.js";

export const UpdateCarbonInventoryParamsSchema = z.object({
  id: z.string().regex(/^\d+$/).describe("The carbon inventory ID"),
});

export const UpdateCarbonInventoryRequestSchema = CarbonInventorySchema.pick({
  organizationId: true,
  organizationBranchId: true,
  organizationData: true,
  year: true,
  usageMode: true,
  methodologyVersionId: true,
  preselectedNodesId: true,
}).partial();

export const UpdateCarbonInventoryResponseSchema = CarbonInventorySchema;

export type UpdateCarbonInventoryParams = z.infer<
  typeof UpdateCarbonInventoryParamsSchema
>;
export type UpdateCarbonInventoryRequest = z.infer<
  typeof UpdateCarbonInventoryRequestSchema
>;
export type UpdateCarbonInventoryResponse = z.infer<
  typeof UpdateCarbonInventoryResponseSchema
>;

