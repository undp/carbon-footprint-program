import { z } from "zod";
import { IdSchema } from "../../zod.js";
import { CategorySchema } from "../baseSchemas.js";

// Request Schema
export const CreateCategoryRequestSchema = z
  .object({
    methodologyVersionId: IdSchema.describe(
      "The ID of the methodology version"
    ),
    name: z.string().min(1).max(255).describe("The name of the category"),
    icon: z.string().min(1).max(255).describe("The icon identifier"),
    color: z.string().min(1).max(50).describe("The color code in HEX format"),
    synonyms: z.string().describe("Comma-separated synonyms"),
    description: z.string().min(1).describe("The description of the category"),
    examples: z.string().nullable().describe("Example text"),
    position: z
      .number()
      .int()
      .min(1)
      .describe("The display position (must be > 0)"),
  })
  .strict();

// Response Schema
export const CreateCategoryResponseSchema = CategorySchema;
