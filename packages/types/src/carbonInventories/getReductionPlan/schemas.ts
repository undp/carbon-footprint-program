import { z } from "zod";
import { IdSchema } from "../../zod.js";
import { IconNameSchema } from "../../common/index.js";

export const GetReductionPlanParamsSchema = z.object({
  id: IdSchema.describe("The carbon inventory ID"),
});

const InitiativeItemSchema = z.object({
  id: IdSchema,
  title: z.string(),
  description: z.string(),
});

const SubcategoryWithInitiativesSchema = z.object({
  id: IdSchema,
  name: z.string(),
  icon: IconNameSchema,
  description: z.string(),
  categoryId: IdSchema,
  initiatives: z.array(InitiativeItemSchema),
});

const CategorySummarySchema = z.object({
  id: IdSchema,
  name: z.string(),
  synonyms: z.string(),
  position: z.number().int().min(1),
  icon: IconNameSchema,
  color: z.string(),
  description: z.string(),
  explanationId: IdSchema.nullable(),
  initiativeCount: z.number().int().nonnegative(),
});

export const GetReductionPlanResponseSchema = z.object({
  categories: z.array(CategorySummarySchema),
  subcategories: z.array(SubcategoryWithInitiativesSchema),
});
