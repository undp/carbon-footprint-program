import { z } from "zod";
import {
  UpdateSubcategoryRecommendationQuerySchema,
  UpdateSubcategoryRecommendationRequestSchema,
  UpdateSubcategoryRecommendationResponseSchema,
} from "./schemas.js";

export type UpdateSubcategoryRecommendationQuery = z.infer<
  typeof UpdateSubcategoryRecommendationQuerySchema
>;
export type UpdateSubcategoryRecommendationRequest = z.infer<
  typeof UpdateSubcategoryRecommendationRequestSchema
>;
export type UpdateSubcategoryRecommendationResponse = z.infer<
  typeof UpdateSubcategoryRecommendationResponseSchema
>;
