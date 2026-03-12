import { z } from "zod";
import type {
  GetCarbonInventoryByIdParamsSchema,
  GetCarbonInventoryByIdResponseSchema,
} from "./schemas.js";

export type GetCarbonInventoryByIdParams = z.infer<
  typeof GetCarbonInventoryByIdParamsSchema
>;

// TypeScript Types
export type GetCarbonInventoryByIdResponse = z.infer<
  typeof GetCarbonInventoryByIdResponseSchema
>;
