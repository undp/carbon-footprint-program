import { z } from "zod";
import { IdSchema } from "../zod.js";
import { CategoryBaseSchema } from "./category.js";

export const SubcategoryBaseSchema = z.object({
  id: IdSchema.describe("The ID of the subcategory"),
  categoryId: CategoryBaseSchema.shape.id.describe(
    "The ID of the category this subcategory belongs to"
  ),
  name: z.string().describe("The name of the subcategory"),
  description: z
    .string()
    .nullable()
    .describe("The description of the subcategory"),
  examples: z.string().nullable().describe("Examples of the subcategory"),
  createdAt: z.iso.datetime().describe("The creation date"),
  updatedAt: z.iso.datetime().nullable().describe("The update date"),
  createdById: IdSchema.nullable().describe(
    "The ID of the user who created the subcategory"
  ),
  updatedById: IdSchema.nullable().describe(
    "The ID of the user who updated the subcategory"
  ),
});
