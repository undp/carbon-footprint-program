import { z } from "zod";
import type {
  GetAllCarbonInventoriesQuerySchema,
  GetAllCarbonInventoriesResponseSchema,
} from "./schemas.js";

// TypeScript Types
export type GetAllCarbonInventoriesQuery = z.infer<
  typeof GetAllCarbonInventoriesQuerySchema
>;

export type GetAllCarbonInventoriesResponse = z.infer<
  typeof GetAllCarbonInventoriesResponseSchema
>;
