import { createGetAllHandler } from "@/handlerFactory/index.js";
import type {
  GetAllSubcategoryRecommendationsQuery,
  GetAllSubcategoryRecommendationsResponse,
} from "@repo/types";
import { getAllSubcategoryRecommendationsService } from "./service.js";

export const getAllSubcategoryRecommendationsHandler = createGetAllHandler<
  GetAllSubcategoryRecommendationsResponse,
  GetAllSubcategoryRecommendationsQuery
>(
  "subcategoryRecommendations",
  getAllSubcategoryRecommendationsService,
  "SubcategoryRecommendation",
  false
);
