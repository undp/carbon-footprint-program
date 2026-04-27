import { createGetAllHandler } from "@/handlerFactory/index.js";
import type { GetAllSubcategoryRecommendationsResponse } from "@repo/types";
import { getAllSubcategoryRecommendationsService } from "./service.js";

export const getAllSubcategoryRecommendationsHandler =
  createGetAllHandler<GetAllSubcategoryRecommendationsResponse>(
    "subcategoryRecommendations",
    getAllSubcategoryRecommendationsService,
    "SubcategoryRecommendation",
    false
  );
