import type { FastifyZodInstance } from "@/types/fastify.js";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import {
  CreateSubcategoryRecommendationBodySchema,
  CreateSubcategoryRecommendationResponseSchema,
} from "@repo/types";
import { createSubcategoryRecommendationHandler } from "./handler.js";

export const createSubcategoryRecommendationRoute = (
  fastify: FastifyZodInstance
): void => {
  fastify.post(
    "/",
    {
      schema: {
        tags: ["subcategory-recommendations"],
        summary: "Create a new subcategory recommendation group",
        body: CreateSubcategoryRecommendationBodySchema,
        response: {
          201: CreateSubcategoryRecommendationResponseSchema,
          400: ApiErrorResponseSchema,
          409: ApiErrorResponseSchema,
        },
      },
    },
    createSubcategoryRecommendationHandler
  );
};
