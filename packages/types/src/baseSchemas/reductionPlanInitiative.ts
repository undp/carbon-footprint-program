import { z } from "zod";
import { IdSchema } from "../zod.js";
import { ReductionPlanInitiativeStatus } from "../enums.js";

export const ReductionPlanInitiativeStatusSchema = z
  .enum(ReductionPlanInitiativeStatus)
  .describe("The status of the reduction plan initiative");

export const ReductionPlanInitiativeBaseSchema = z.object({
  id: IdSchema.describe("The ID of the reduction plan initiative"),
  subcategoryId: IdSchema.describe(
    "The ID of the subcategory this initiative belongs to"
  ),
  dimensionValue1Id: IdSchema.nullable().describe(
    "The ID of the first dimension value"
  ),
  dimensionValue2Id: IdSchema.nullable().describe(
    "The ID of the second dimension value"
  ),
  title: z.string().trim().min(1).describe("The title of the initiative"),
  description: z
    .string()
    .trim()
    .min(1)
    .describe("The description of the initiative"),
  status: ReductionPlanInitiativeStatusSchema,
  createdAt: z.iso.datetime().describe("The creation date"),
  updatedAt: z.iso.datetime().nullable().describe("The update date"),
  createdById: IdSchema.nullable().describe(
    "The ID of the user who created the initiative"
  ),
  updatedById: IdSchema.nullable().describe(
    "The ID of the user who updated the initiative"
  ),
});
