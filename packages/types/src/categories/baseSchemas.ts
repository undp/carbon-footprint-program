import { z } from "zod";
import { IdSchema } from "../zod.js";

import { CategoryStatus } from "@repo/database/enums";

// Enums
export const CategoryStatusSchema = z.enum(CategoryStatus);

// Base Category schema
export const CategorySchema = z
  .object({
    id: IdSchema.describe("The ID of the category"),
    methodologyVersionId: IdSchema.describe(
      "The ID of the methodology version"
    ),
    name: z
      .string()
      .min(1, "Required field")
      .describe("The name of the category"),
    icon: z.string().describe("The icon identifier for the category"),
    color: z.string().describe("The color code for the category"),
    synonyms: z.string().describe("Comma-separated synonyms"),
    description: z
      .string()
      .min(1, "Required field")
      .describe("The description of the category"),
    examples: z.string().nullable().describe("Optional examples text"),
    position: z.number().int().describe("The display position of the category"),
    status: CategoryStatusSchema.describe("The status of the category"),
    createdAt: z.iso.datetime().describe("The creation timestamp"),
    updatedAt: z.iso
      .datetime()
      .nullable()
      .describe("The last update timestamp"),
    createdById: IdSchema.nullable().describe(
      "The ID of the user who created this"
    ),
    updatedById: IdSchema.nullable().describe(
      "The ID of the user who last updated this"
    ),
  })
  .strict();
