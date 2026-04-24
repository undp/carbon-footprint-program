import { createPostHandler } from "@/handlerFactory/index.js";
import type {
  CreateSubcategoryRecommendationRequest,
  CreateSubcategoryRecommendationResponse,
} from "@repo/types";
import { createSubcategoryRecommendationService } from "./service.js";

export const createSubcategoryRecommendationHandler = createPostHandler<
  CreateSubcategoryRecommendationRequest,
  CreateSubcategoryRecommendationResponse
>(
  "subcategoryRecommendations",
  createSubcategoryRecommendationService,
  "SubcategoryRecommendation"
);
