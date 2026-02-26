import { z } from "zod";
import { IdSchema } from "../../zod.js";
import { SubCategoryWithUnitsSchema } from "../baseSchemas.js";

// Params Schema
export const UpdateSubcategoryParamsSchema = z
  .object({
    id: IdSchema.describe("The ID of the sub-category to update"),
  })
  .strict();

// Request Schema — all fields optional for partial updates, but at least one must be provided
export const UpdateSubcategoryRequestSchema = z
  .object({
    name: z
      .string()
      .min(1)
      .max(255)
      .describe("The name of the sub-category"),
    icon: z.string().min(1).max(255).describe("The icon identifier"),
    color: z.string().min(1).max(50).describe("The color code"),
    description: z.string().min(1).describe("The description"),
    examples: z.string().nullable().describe("Optional examples text"),
    measurementUnitIds: z
      .array(IdSchema)
      .describe("IDs of the accepted measurement units"),
  })
  .partial()
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field must be provided",
  });

// Response Schema
export const UpdateSubcategoryResponseSchema = SubCategoryWithUnitsSchema;
