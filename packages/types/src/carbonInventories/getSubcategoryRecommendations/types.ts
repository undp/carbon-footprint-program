import { z } from "zod";
import type {
  GetSubcategoryRecommendationsParamsSchema,
  GetSubcategoryRecommendationsResponseSchema,
} from "./schemas.js";

export type GetSubcategoryRecommendationsParams = z.infer<
  typeof GetSubcategoryRecommendationsParamsSchema
>;

export type GetSubcategoryRecommendationsResponse = z.infer<
  typeof GetSubcategoryRecommendationsResponseSchema
>;
