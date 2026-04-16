import { z } from "zod";
import { IdSchema } from "../../zod.js";
import {
  CategoryBaseSchema,
  ReductionPlanInitiativeBaseSchema,
  SubcategoryBaseSchema,
} from "../../baseSchemas/index.js";

export const GetReductionPlanParamsSchema = z.object({
  id: IdSchema.describe("The carbon inventory ID"),
});

const SubcategoryWithInitiativesSchema = SubcategoryBaseSchema.pick({
  id: true,
  name: true,
  icon: true,
  description: true,
}).extend({
  initiatives: z.array(
    ReductionPlanInitiativeBaseSchema.pick({
      id: true,
      title: true,
      description: true,
    })
  ),
});

const CategoryWithSubcategoriesSchema = CategoryBaseSchema.pick({
  id: true,
  name: true,
  synonyms: true,
  position: true,
  icon: true,
  color: true,
  description: true,
  explanationSlug: true,
}).extend({
  subcategories: z.array(SubcategoryWithInitiativesSchema),
});

export const GetReductionPlanResponseSchema = z.object({
  categories: z.array(CategoryWithSubcategoriesSchema),
});
