import { z } from "zod";
import { CarbonInventorySchema } from "./base.js";

// Response Schemas
export const GetAllCarbonInventoriesResponseSchema = z.array(
  CarbonInventorySchema.omit({ subcategories: true })
);

// TypeScript Types
export type GetAllCarbonInventoriesResponse = z.infer<
  typeof GetAllCarbonInventoriesResponseSchema
>;
