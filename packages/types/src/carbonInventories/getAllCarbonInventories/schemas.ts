import { z } from "zod";
import { CarbonInventoryBaseSchema } from "../../baseSchemas/index.js";
import { CarbonInventoryDisplayStatusSchema } from "../schemas.js";

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
const CarbonInventoryItem = CarbonInventoryBaseSchema.omit({
  status: true,
}).extend({
  status: CarbonInventoryDisplayStatusSchema,
  totalEmissions: z
    .number()
    .describe("The total calculated emissions for this inventory"),
});

// Response Schemas
export const GetAllCarbonInventoriesResponseSchema =
  z.array(CarbonInventoryItem);
