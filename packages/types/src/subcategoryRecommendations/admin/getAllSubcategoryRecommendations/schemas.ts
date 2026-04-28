import { z } from "zod";
import { IdSchema } from "../../../zod.js";
import { MethodologyIdQuerySchema } from "../../baseSchemas/methodologyIdQuery.js";

export const GetAllSubcategoryRecommendationsQuerySchema =
  MethodologyIdQuerySchema;

export const SubcategoryRecommendationGroupRefSchema = z.object({
  sectorId: IdSchema.describe("The ID of the sector"),
  subsectorId: IdSchema.nullable().describe(
    "The ID of the subsector (null if the group is not scoped to a subsector)"
  ),
  subcategoryIds: z
    .array(IdSchema)
    .describe("The IDs of the subcategories recommended for this group"),
});

export const SubcategoryRecommendationGroupSchema =
  SubcategoryRecommendationGroupRefSchema.extend({
    sectorName: z.string().describe("The resolved name of the sector"),
    subsectorName: z
      .string()
      .nullable()
      .describe("The resolved name of the subsector (null if not scoped)"),
  });

export const GetAllSubcategoryRecommendationsResponseSchema = z.array(
  SubcategoryRecommendationGroupSchema
);
