import { z } from "zod";
import type {
  GetCarbonInventorySubcategoryRecommendationsParamsSchema,
  GetCarbonInventorySubcategoryRecommendationsResponseSchema,
} from "./schemas.js";

export type GetCarbonInventorySubcategoryRecommendationsParams = z.infer<
  typeof GetCarbonInventorySubcategoryRecommendationsParamsSchema
>;

export type GetCarbonInventorySubcategoryRecommendationsResponse = z.infer<
  typeof GetCarbonInventorySubcategoryRecommendationsResponseSchema
>;
