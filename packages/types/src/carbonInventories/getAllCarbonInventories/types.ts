import { z } from "zod";
import type {
  GetAllCarbonInventoriesQuerySchema,
  CarbonInventoryWithEmissionsSchema,
  GetAllCarbonInventoriesResponseSchema,
} from "./schemas.js";

// TypeScript Types
export type GetAllCarbonInventoriesQuery = z.infer<
  typeof GetAllCarbonInventoriesQuerySchema
>;

export type CarbonInventoryWithEmissions = z.infer<
  typeof CarbonInventoryWithEmissionsSchema
>;

export type GetAllCarbonInventoriesResponse = z.infer<
  typeof GetAllCarbonInventoriesResponseSchema
>;
