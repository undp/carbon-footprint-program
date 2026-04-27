import { z } from "zod";
import { IdSchema } from "../../../zod.js";
import { SubcategoryRecommendationGroupRefSchema } from "../getAllSubcategoryRecommendations/schemas.js";

export const UpdateSubcategoryRecommendationQuerySchema = z.object({
  sectorId: z.coerce
    .number()
    .int()
    .positive()
    .describe("The ID of the sector (required)"),
  subsectorId: z
    .preprocess(
      (v) => (v === "" || v == null ? null : v),
      z.coerce.number().int().positive().nullable()
    )
    .describe(
      "The ID of the subsector; omit or send empty value to target the no-subsector group"
    ),
});

export const UpdateSubcategoryRecommendationRequestSchema = z.object({
  subcategoryIds: z
    .array(IdSchema)
    .refine((arr) => new Set(arr).size === arr.length, {
      message: "subcategoryIds must be unique",
    })
    .describe(
      "The IDs of the subcategories to recommend; empty array soft-deletes the group"
    ),
});

export const UpdateSubcategoryRecommendationResponseSchema =
  SubcategoryRecommendationGroupRefSchema;
