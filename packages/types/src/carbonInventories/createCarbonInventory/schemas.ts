import { CarbonInventorySchema } from "../baseSchemas.js";

export const CreateCarbonInventoryRequestSchema = CarbonInventorySchema.pick({
  usageMode: true,
});

export const CreateCarbonInventoryResponseSchema = CarbonInventorySchema.omit({
  subcategories: true,
});
