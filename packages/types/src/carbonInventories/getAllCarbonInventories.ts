import { z } from "zod";
import { CarbonInventorySchema } from "./base.js";

// Query schema
export const GetAllCarbonInventoriesQuerySchema = z.object({
  year: z
    .string()
    .optional()
    .describe(
      'Optional year filter. Use "all" for all years, a specific year (e.g., "2024"), or omit for all years'
    ),
});

// Response item schema with totalEmissions field added
export const CarbonInventoryWithEmissionsSchema = CarbonInventorySchema.omit({
  subcategories: true,
}).extend({
  totalEmissions: z
    .number()
    .describe("The total calculated emissions for this inventory"),
});

// Response Schemas
export const GetAllCarbonInventoriesResponseSchema = z.array(
  CarbonInventoryWithEmissionsSchema
);

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
