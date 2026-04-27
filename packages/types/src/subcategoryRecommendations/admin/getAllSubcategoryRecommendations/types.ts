import { z } from "zod";
import {
  ListSubcategoryRecommendationsResponseSchema,
  SubcategoryRecommendationGroupSchema,
} from "./schemas.js";

export type SubcategoryRecommendationGroup = z.infer<
  typeof SubcategoryRecommendationGroupSchema
>;
export type ListSubcategoryRecommendationsResponse = z.infer<
  typeof ListSubcategoryRecommendationsResponseSchema
>;
