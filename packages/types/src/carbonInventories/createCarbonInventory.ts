import { z } from "zod";
import { CarbonInventorySchema } from "./base.js";

export const CreateCarbonInventoryRequestSchema = CarbonInventorySchema.pick({
  usageMode: true,
});

export const CreateCarbonInventoryResponseSchema = CarbonInventorySchema.omit({
  subcategories: true,
});

// TypeScript Types
export type CreateCarbonInventoryRequest = z.infer<
  typeof CreateCarbonInventoryRequestSchema
>;

export type CreateCarbonInventoryResponse = z.infer<
  typeof CreateCarbonInventoryResponseSchema
>;
