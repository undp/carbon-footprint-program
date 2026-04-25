import type { FastifyZodInstance } from "@/types/fastify.js";
import {
  UpdateSubcategoryRecommendationQuerySchema,
  UpdateSubcategoryRecommendationRequestSchema,
  UpdateSubcategoryRecommendationResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { updateSubcategoryRecommendationHandler } from "./handler.js";

export const updateSubcategoryRecommendationRoute = (
  fastify: FastifyZodInstance
) => {
  fastify.put(
    "/",
    {
      schema: {
        tags: ["subcategory-recommendations"],
        summary: "Bulk-replace a subcategory recommendation group",
        description:
          "Idempotent diff-based replace for a (sectorId, subsectorId) group. An empty `subcategoryIds` array soft-deletes the group.",
        querystring: UpdateSubcategoryRecommendationQuerySchema,
        body: UpdateSubcategoryRecommendationRequestSchema,
        response: {
          200: UpdateSubcategoryRecommendationResponseSchema,
          400: ApiErrorResponseSchema,
          401: ApiErrorResponseSchema,
          403: ApiErrorResponseSchema,
        },
      },
    },
    updateSubcategoryRecommendationHandler
  );
};
