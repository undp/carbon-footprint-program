import { z } from "zod";
import { IdSchema } from "../../../zod.js";

export const SubcategoryRecommendationGroupSchema = z.object({
  sectorId: IdSchema.describe("The ID of the sector"),
  subsectorId: IdSchema.nullable().describe(
    "The ID of the subsector (null if the group is not scoped to a subsector)"
  ),
  sectorName: z.string().describe("The resolved name of the sector"),
  subsectorName: z
    .string()
    .nullable()
    .describe("The resolved name of the subsector (null if not scoped)"),
  subcategoryIds: z
    .array(IdSchema)
    .describe("The IDs of the subcategories recommended for this group"),
});

export const ListSubcategoryRecommendationsResponseSchema = z.array(
  SubcategoryRecommendationGroupSchema
);
