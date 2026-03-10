import { z } from "zod";
import type {
  UpdateCarbonInventoryRequestSchema,
  UpdateCarbonInventoryResponseSchema,
  UpdateCarbonInventoryParamsSchema,
} from "./schemas.js";

// TypeScript Types
export type UpdateCarbonInventoryRequest = z.infer<
  typeof UpdateCarbonInventoryRequestSchema
>;

export type UpdateCarbonInventoryResponse = z.infer<
  typeof UpdateCarbonInventoryResponseSchema
>;

export type UpdateCarbonInventoryParams = z.infer<
  typeof UpdateCarbonInventoryParamsSchema
>;
