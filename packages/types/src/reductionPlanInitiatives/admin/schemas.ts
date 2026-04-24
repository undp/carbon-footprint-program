import { z } from "zod";

import {
  REDUCTION_PLAN_INITIATIVE_TITLE_MAX_LENGTH,
  REDUCTION_PLAN_INITIATIVE_DESCRIPTION_MAX_LENGTH,
} from "@repo/constants";

import { IdSchema } from "../../zod.js";

export const ReductionPlanInitiativeMutationDataSchema = z.strictObject({
  title: z
    .string()
    .trim()
    .min(1)
    .max(REDUCTION_PLAN_INITIATIVE_TITLE_MAX_LENGTH)
    .describe("The title of the reduction plan initiative"),
  description: z
    .string()
    .trim()
    .min(1)
    .max(REDUCTION_PLAN_INITIATIVE_DESCRIPTION_MAX_LENGTH)
    .describe("The description of the reduction plan initiative"),
  subcategoryId: IdSchema.describe(
    "The ID of the subcategory this reduction plan initiative belongs to"
  ),
});

export type ReductionPlanInitiativeMutationData = z.infer<
  typeof ReductionPlanInitiativeMutationDataSchema
>;
