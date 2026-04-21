import { z } from "zod";

import {
  ReductionPlanInitiativeBaseSchema,
  SubcategoryBaseSchema,
  CategoryBaseSchema,
} from "../../../baseSchemas/index.js";

export const AdminInitiativeListItemSchema =
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

export const GetAllInitiativesResponseSchema = z.array(
  AdminInitiativeListItemSchema
);
