import { z } from "zod";
import { IdSchema } from "../../../zod.js";

export const UpdateSubcategoryRecommendationRequestSchema = z.object({
  methodologyId: IdSchema.describe(
    "The ID of the methodology version this group belongs to"
  ),
  sectorId: IdSchema.describe("The ID of the sector"),
  subsectorId: IdSchema.nullable().describe(
    "The ID of the subsector, or null to target the no-subsector group"
  ),
  subcategoryIds: z
    .array(IdSchema)
    .refine((arr) => new Set(arr).size === arr.length, {
      message: "subcategoryIds must be unique",
    })
    .describe(
      "The IDs of the subcategories to recommend; empty array soft-deletes the group"
    ),
});

export const UpdateSubcategoryRecommendationResponseSchema = z.object({});
