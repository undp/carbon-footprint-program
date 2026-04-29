import { z } from "zod";
import {
  GetAllSubcategoryRecommendationsQuerySchema,
  GetAllSubcategoryRecommendationsResponseSchema,
  SubcategoryRecommendationGroupRefSchema,
  SubcategoryRecommendationGroupSchema,
} from "./schemas.js";

export type SubcategoryRecommendationGroupRef = z.infer<
  typeof SubcategoryRecommendationGroupRefSchema
>;
export type SubcategoryRecommendationGroup = z.infer<
  typeof SubcategoryRecommendationGroupSchema
>;
export type GetAllSubcategoryRecommendationsQuery = z.infer<
  typeof GetAllSubcategoryRecommendationsQuerySchema
>;
export type GetAllSubcategoryRecommendationsResponse = z.infer<
  typeof GetAllSubcategoryRecommendationsResponseSchema
>;
