import { z } from "zod";
import { CarbonInventorySchema } from "./base.js";

export const GetCarbonInventoryByIdResponseSchema = CarbonInventorySchema;

// TypeScript Types
export type GetCarbonInventoryByIdResponse = z.infer<
  typeof GetCarbonInventoryByIdResponseSchema
>;
