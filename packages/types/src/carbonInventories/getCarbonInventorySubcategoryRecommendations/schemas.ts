import { z } from "zod";
import { IdSchema } from "../../zod.js";

export const GetCarbonInventorySubcategoryRecommendationsParamsSchema =
  z.object({
    id: IdSchema.describe("The carbon inventory ID"),
  });

export const GetCarbonInventorySubcategoryRecommendationsResponseSchema =
  z.array(IdSchema);
