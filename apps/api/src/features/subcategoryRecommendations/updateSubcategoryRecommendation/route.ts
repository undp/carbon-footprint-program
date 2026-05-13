import { defineRoute } from "@/routing/defineRoute.js";
import {
  UpdateSubcategoryRecommendationRequest,
  UpdateSubcategoryRecommendationRequestSchema,
  UpdateSubcategoryRecommendationResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { updateSubcategoryRecommendationHandler } from "./handler.js";

export const updateSubcategoryRecommendationRoute = defineRoute<{
  Body: UpdateSubcategoryRecommendationRequest;
}>({
  method: "PUT",
  path: "/",
  schema: {
    tags: ["subcategory-recommendations"],
    summary: "Bulk-replace a subcategory recommendation group",
    description:
      "Idempotent diff-based replace for a (sectorId, subsectorId) group. An empty `subcategoryIds` array soft-deletes the group.",
    body: UpdateSubcategoryRecommendationRequestSchema,
    response: {
      200: UpdateSubcategoryRecommendationResponseSchema,
      400: ApiErrorResponseSchema,
      401: ApiErrorResponseSchema,
      403: ApiErrorResponseSchema,
    },
  },
  access: { mode: "private" },
  handler: updateSubcategoryRecommendationHandler,
});
