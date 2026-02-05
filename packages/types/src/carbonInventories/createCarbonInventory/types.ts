import { z } from "zod";
import type {
  CreateCarbonInventoryRequestSchema,
  CreateCarbonInventoryResponseSchema,
} from "./schemas.js";

// TypeScript Types
export type CreateCarbonInventoryRequest = z.infer<
  typeof CreateCarbonInventoryRequestSchema
>;

export type CreateCarbonInventoryResponse = z.infer<
  typeof CreateCarbonInventoryResponseSchema
>;
