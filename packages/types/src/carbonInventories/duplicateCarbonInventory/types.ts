import { z } from "zod";
import type {
  DuplicateCarbonInventoryParamsSchema,
  DuplicateCarbonInventoryResponseSchema,
} from "./schemas.js";

// TypeScript Types
export type DuplicateCarbonInventoryParams = z.infer<
  typeof DuplicateCarbonInventoryParamsSchema
>;

export type DuplicateCarbonInventoryResponse = z.infer<
  typeof DuplicateCarbonInventoryResponseSchema
>;
