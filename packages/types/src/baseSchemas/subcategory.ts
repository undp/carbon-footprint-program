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
  explanation: z
    .string()
    .nullable()
    .describe("Inline markdown explanation content, if any"),
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
