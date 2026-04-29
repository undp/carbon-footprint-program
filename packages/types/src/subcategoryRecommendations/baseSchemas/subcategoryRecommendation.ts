import { z } from "zod";
import { IdSchema } from "../../zod.js";
import { SubcategoryRecommendationStatus } from "../../enums.js";

export const SubcategoryRecommendationBaseSchema = z.object({
  id: IdSchema.describe("The ID of the subcategory recommendation"),
  subcategoryId: IdSchema.describe("The ID of the recommended subcategory"),
  sectorId: IdSchema.describe("The ID of the sector"),
  subsectorId: IdSchema.nullable().describe(
    "The ID of the subsector (null if not scoped to a subsector)"
  ),
  status: z
    .enum(SubcategoryRecommendationStatus)
    .describe("The status of the recommendation"),
  createdAt: z.iso.datetime().describe("The creation date"),
  updatedAt: z.iso.datetime().nullable().describe("The last update date"),
  createdById: IdSchema.nullable().describe(
    "The ID of the user who created this recommendation"
  ),
  updatedById: IdSchema.nullable().describe(
    "The ID of the user who last updated this recommendation"
  ),
});
