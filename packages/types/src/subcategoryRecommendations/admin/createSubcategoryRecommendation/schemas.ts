import { z } from "zod";
import { IdSchema } from "../../../zod.js";
import { SubcategoryRecommendationGroupSchema } from "../listSubcategoryRecommendations/schemas.js";

export const CreateSubcategoryRecommendationRequestSchema = z.object({
  sectorId: IdSchema.describe("The ID of the sector"),
  subsectorId: IdSchema.nullable().describe(
    "The ID of the subsector, or null to target the no-subsector group"
  ),
  subcategoryIds: z
    .array(IdSchema)
    .min(1, { message: "subcategoryIds must contain at least one ID" })
    .refine((arr) => new Set(arr).size === arr.length, {
      message: "subcategoryIds must be unique",
    })
    .describe("The IDs of the subcategories to recommend"),
});

export const CreateSubcategoryRecommendationResponseSchema =
  SubcategoryRecommendationGroupSchema;
