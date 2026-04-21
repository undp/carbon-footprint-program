import { z } from "zod";

import {
  REDUCTION_PLAN_INITIATIVE_TITLE_MAX_LENGTH,
  REDUCTION_PLAN_INITIATIVE_DESCRIPTION_MAX_LENGTH,
} from "@repo/constants";

import { IdSchema } from "../../zod.js";

export const InitiativeMutationDataSchema = z.strictObject({
  title: z
    .string()
    .trim()
    .min(1)
    .max(REDUCTION_PLAN_INITIATIVE_TITLE_MAX_LENGTH)
    .describe("The title of the initiative"),
  description: z
    .string()
    .trim()
    .min(1)
    .max(REDUCTION_PLAN_INITIATIVE_DESCRIPTION_MAX_LENGTH)
    .describe("The description of the initiative"),
  subcategoryId: IdSchema.describe(
    "The ID of the subcategory this initiative belongs to"
  ),
});

export type InitiativeMutationData = z.infer<
  typeof InitiativeMutationDataSchema
>;
