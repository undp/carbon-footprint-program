import { z } from "zod";
import {
  UpdateSubcategoryRecommendationRequestSchema,
  UpdateSubcategoryRecommendationResponseSchema,
} from "./schemas.js";

export type UpdateSubcategoryRecommendationRequest = z.infer<
  typeof UpdateSubcategoryRecommendationRequestSchema
>;
export type UpdateSubcategoryRecommendationResponse = z.infer<
  typeof UpdateSubcategoryRecommendationResponseSchema
>;
