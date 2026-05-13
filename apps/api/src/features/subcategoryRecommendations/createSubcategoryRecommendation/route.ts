import { defineRoute } from "@/routing/defineRoute.js";
import {
  CreateSubcategoryRecommendationRequest,
  CreateSubcategoryRecommendationRequestSchema,
  CreateSubcategoryRecommendationResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { createSubcategoryRecommendationHandler } from "./handler.js";

export const createSubcategoryRecommendationRoute = defineRoute<{
  Body: CreateSubcategoryRecommendationRequest;
}>({
  method: "POST",
  path: "/",
  schema: {
    tags: ["subcategory-recommendations"],
    summary: "Create a subcategory recommendation group",
    description:
      "Create ACTIVE recommendations for a (sectorId, subsectorId) tuple. Fails with 409 if an ACTIVE group already exists.",
    body: CreateSubcategoryRecommendationRequestSchema,
    response: {
      201: CreateSubcategoryRecommendationResponseSchema,
      400: ApiErrorResponseSchema,
      401: ApiErrorResponseSchema,
      403: ApiErrorResponseSchema,
      409: ApiErrorResponseSchema,
    },
  },
  access: { mode: "private" },
  handler: createSubcategoryRecommendationHandler,
});
