import { z } from "zod";
import { IdSchema } from "../zod.js";

export const EmissionFactorDimensionValueBaseSchema = z.object({
  id: IdSchema.describe("The ID of the dimension value"),
  dimensionId: IdSchema.describe(
    "The ID of the dimension this value belongs to"
  ),
  parentValueId: IdSchema.nullable().describe(
    "The ID of the parent value if this is a nested value"
  ),
  value: z.string().describe("The value of the dimension value"),
  isActive: z.boolean().describe("Whether this dimension value is active"),
  createdAt: z.iso
    .datetime()
    .describe("The creation date of the dimension value"),
  updatedAt: z.iso
    .datetime()
    .nullable()
    .describe("The last update date of the dimension value"),
  createdById: IdSchema.nullable().describe(
    "The ID of the user who created the dimension value"
  ),
  updatedById: IdSchema.nullable().describe(
    "The ID of the user who last updated the dimension value"
  ),
});
