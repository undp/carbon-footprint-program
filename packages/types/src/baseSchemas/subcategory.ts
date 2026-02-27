import { z } from "zod";
import { IdSchema } from "../zod.js";
import { SubCategoryStatus } from "@repo/database/enums";

// Base SubCategory schema
export const SubCategorySchema = z.strictObject({
  id: IdSchema.describe("The ID of the sub-category"),
  categoryId: IdSchema.describe("The ID of the parent category"),
  name: z
    .string()
    .min(1, "Campo requerido")
    .describe("The name of the sub-category"),
  icon: z
    .string()
    .min(1, "Campo requerido")
    .describe("The icon identifier for the sub-category"),
  description: z
    .string()
    .min(1, "Campo requerido")
    .describe("The description of the sub-category"),
  examples: z.string().nullable().describe("Optional examples text"),
  status: z.enum(SubCategoryStatus).describe("The status of the sub-category"),
  createdAt: z.iso.datetime().describe("The creation timestamp"),
  updatedAt: z.iso.datetime().nullable().describe("The last update timestamp"),
  createdById: IdSchema.nullable().describe(
    "The ID of the user who created this"
  ),
  updatedById: IdSchema.nullable().describe(
    "The ID of the user who last updated this"
  ),
});
