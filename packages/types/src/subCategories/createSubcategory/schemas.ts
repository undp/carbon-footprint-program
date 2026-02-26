import { z } from "zod";
import { IdSchema } from "../../zod.js";
import { SubCategoryWithUnitsSchema } from "../baseSchemas.js";

// Request Schema
export const CreateSubcategoryRequestSchema = z
  .object({
    categoryId: IdSchema.describe("The ID of the parent category"),
    name: z.string().min(1).max(255).describe("The name of the sub-category"),
    icon: z.string().min(1).max(255).describe("The icon identifier"),
    color: z
      .string()
      .min(1)
      .max(50)
      .describe("The color code in HEX format"),
    description: z.string().min(1).describe("The description"),
    examples: z.string().nullable().describe("Optional examples text"),
    measurementUnitIds: z
      .array(IdSchema)
      .describe("IDs of the accepted measurement units"),
  })
  .strict();

// Response Schema
export const CreateSubcategoryResponseSchema = SubCategoryWithUnitsSchema;
