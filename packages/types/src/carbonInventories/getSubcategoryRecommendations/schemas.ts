import { z } from "zod";
import { IdSchema } from "../../zod.js";

export const GetSubcategoryRecommendationsParamsSchema = z.object({
  id: IdSchema.describe("The carbon inventory ID"),
});

export const GetSubcategoryRecommendationsResponseSchema = z.array(IdSchema);
