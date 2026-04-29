import { z } from "zod";

import {
  ReductionPlanInitiativeBaseSchema,
  SubcategoryBaseSchema,
  CategoryBaseSchema,
} from "../../../baseSchemas/index.js";
import { IdSchema } from "../../../zod.js";

export const AdminReductionPlanInitiativeListItemSchema =
  ReductionPlanInitiativeBaseSchema.pick({
    id: true,
    title: true,
    description: true,
    subcategoryId: true,
    createdAt: true,
    updatedAt: true,
  }).extend({
    subcategory: SubcategoryBaseSchema.pick({ id: true, name: true }).extend({
      category: CategoryBaseSchema.pick({ id: true, name: true }),
    }),
  });

export const GetAllReductionPlanInitiativesResponseSchema = z.array(
  AdminReductionPlanInitiativeListItemSchema
);

export const GetAllReductionPlanInitiativesQuerySchema = z.object({
  methodologyVersionId: IdSchema.optional(),
});
