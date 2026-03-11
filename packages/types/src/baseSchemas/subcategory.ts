import { z } from "zod";
import { IdSchema } from "../zod.js";
import { SubcategoryStatus } from "../enums.js";
import { CategoryBaseSchema } from "./category.js";

export const SubcategoryBaseSchema = z.object({
  id: IdSchema.describe("The ID of the subcategory"),
  categoryId: CategoryBaseSchema.shape.id.describe(
    "The ID of the category this subcategory belongs to"
  ),
  name: z.string().min(1).describe("The name of the subcategory"),
  icon: z.string().min(1).describe("The icon identifier"),
  description: z
    .string()
    .nullable()
    .describe("The description of the subcategory"),
  explanationId: IdSchema.nullable().describe(
    "The ID of the explanation associated with this subcategory, if any"
  ),
  examples: z.string().nullable().describe("Examples of the subcategory"),
  status: z.enum(SubcategoryStatus).describe("The status of the subcategory"),
  createdAt: z.iso.datetime().describe("The creation date"),
  updatedAt: z.iso.datetime().nullable().describe("The update date"),
  createdById: IdSchema.nullable().describe(
    "The ID of the user who created the subcategory"
  ),
  updatedById: IdSchema.nullable().describe(
    "The ID of the user who updated the subcategory"
  ),
});
