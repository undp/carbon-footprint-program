import { z } from "zod";
import { CarbonInventorySchema } from "../baseSchemas.js";

// Query schema
export const GetAllCarbonInventoriesQuerySchema = z.object({
  year: z
    .string()
    .regex(/^\d+$/, "Year must be a valid number")
    .optional()
    .describe(
      'Optional year filter. Must be a number (e.g., "2024"). Omit to get all years.'
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
