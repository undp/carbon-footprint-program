import { z } from "zod";
import {
  CreateSubcategoryRecommendationRequestSchema,
  CreateSubcategoryRecommendationResponseSchema,
} from "./schemas.js";

export type CreateSubcategoryRecommendationRequest = z.infer<
  typeof CreateSubcategoryRecommendationRequestSchema
>;
export type CreateSubcategoryRecommendationResponse = z.infer<
  typeof CreateSubcategoryRecommendationResponseSchema
>;
