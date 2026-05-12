import { StandardRouteSignature } from "@/routes/api/index.js";
import {
  UpdateSubcategoryRecommendationRequestSchema,
  UpdateSubcategoryRecommendationResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { updateSubcategoryRecommendationHandler } from "./handler.js";

export const updateSubcategoryRecommendationRoute: StandardRouteSignature = (
  fastify,
  options
) => {
  fastify.put(
    "/",
    {
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
      config: {
        allowPublicAccess: options?.allowPublicAccess ?? false,
        allowAnonymousAccess: options?.allowAnonymousAccess ?? false,
      },
    },
    updateSubcategoryRecommendationHandler
  );
};
