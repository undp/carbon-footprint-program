import { z } from "zod";
import { IdSchema } from "../../zod.js";
import { CategoryBaseSchema } from "../../baseSchemas/index.js";

// Params Schema
export const UpdateCategoryParamsSchema = z
  .object({
    id: IdSchema.describe("The ID of the category to update"),
  })
  .strict();

// Request Schema — all fields optional for partial updates, but at least one must be provided
export const UpdateCategoryRequestSchema = CategoryBaseSchema.pick({
  name: true,
  icon: true,
  color: true,
  synonyms: true,
  description: true,
  examples: true,
  position: true,
})
  .partial()
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field must be provided",
  });

// Response Schema
export const UpdateCategoryResponseSchema = CategoryBaseSchema;
