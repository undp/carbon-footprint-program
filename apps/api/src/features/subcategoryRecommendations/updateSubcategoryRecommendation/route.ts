import type { FastifyZodInstance } from "@/types/fastify.js";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import {
  UpdateSubcategoryRecommendationQuerySchema,
  UpdateSubcategoryRecommendationBodySchema,
  UpdateSubcategoryRecommendationResponseSchema,
} from "@repo/types";
import { updateSubcategoryRecommendationHandler } from "./handler.js";

export const updateSubcategoryRecommendationRoute = (
  fastify: FastifyZodInstance
): void => {
  fastify.put(
    "/",
    {
      schema: {
        tags: ["subcategory-recommendations"],
        summary: "Bulk-replace subcategory recommendations for a group",
        querystring: UpdateSubcategoryRecommendationQuerySchema,
        body: UpdateSubcategoryRecommendationBodySchema,
        response: {
          200: UpdateSubcategoryRecommendationResponseSchema,
          400: ApiErrorResponseSchema,
        },
      },
    },
    updateSubcategoryRecommendationHandler
  );
};
