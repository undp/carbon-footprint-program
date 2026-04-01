import { z } from "zod";
import { IdSchema } from "../../zod.js";

export const GetCarbonInventorySubcategoryRecommendationsParamsSchema =
  z.object({
    id: IdSchema.describe("The carbon inventory ID"),
  });

export const GetCarbonInventorySubcategoryRecommendationsResponseSchema =
  z.object({
    subcategoryIds: z.array(IdSchema),
  });
