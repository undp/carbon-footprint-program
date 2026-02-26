import { z } from "zod";
import { IdSchema } from "../../zod.js";
import { CategorySchema } from "../baseSchemas.js";

// Params Schema
export const UpdateCategoryParamsSchema = z
  .object({
    id: IdSchema.describe("The ID of the category to update"),
  })
  .strict();

// Request Schema — all fields optional for partial updates, but at least one must be provided
export const UpdateCategoryRequestSchema = z
  .object({
    name: z.string().min(1).max(255).describe("The name of the category"),
    icon: z.string().min(1).max(255).describe("The icon identifier"),
    color: z.string().min(1).max(50).describe("The color code"),
    synonyms: z.string().min(1).describe("Comma-separated synonyms"),
    description: z.string().min(1).describe("The description"),
    examples: z.string().nullable().describe("Optional examples text"),
    position: z
      .number()
      .int()
      .min(1)
      .describe("The display position (must be > 0)"),
  })
  .partial()
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field must be provided",
  });

// Response Schema
export const UpdateCategoryResponseSchema = CategorySchema;
