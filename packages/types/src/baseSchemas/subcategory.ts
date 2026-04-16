import { z } from "zod";
import { IdSchema } from "../zod.js";
import { SubcategoryStatus } from "../enums.js";
import { CategoryBaseSchema } from "./category.js";
import { IconNameSchema } from "../common/index.js";

export const SubcategoryBaseSchema = z.object({
  id: IdSchema.describe("The ID of the subcategory"),
  categoryId: CategoryBaseSchema.shape.id.describe(
    "The ID of the category this subcategory belongs to"
  ),
  name: z.string().trim().min(1).describe("The name of the subcategory"),
  icon: IconNameSchema.describe("The icon identifier"),
  description: z
    .string()
    .trim()
    .min(1)
    .describe("The description of the subcategory"),
  explanationSlug: z
    .string()
    .nullable()
    .describe(
      "The slug of the explanation associated with this subcategory, if any"
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
