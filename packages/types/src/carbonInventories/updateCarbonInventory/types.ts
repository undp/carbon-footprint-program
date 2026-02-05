import { z } from "zod";
import type {
  UpdateCarbonInventoryRequestSchema,
  UpdateCarbonInventoryResponseSchema,
} from "./schemas.js";

// TypeScript Types
export type UpdateCarbonInventoryRequest = z.infer<
  typeof UpdateCarbonInventoryRequestSchema
>;

export type UpdateCarbonInventoryResponse = z.infer<
  typeof UpdateCarbonInventoryResponseSchema
>;
