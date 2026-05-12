import { StandardRouteSignature } from "@/routes/api/index.js";
import {
  CreateSubcategoryRecommendationRequestSchema,
  CreateSubcategoryRecommendationResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { createSubcategoryRecommendationHandler } from "./handler.js";

export const createSubcategoryRecommendationRoute: StandardRouteSignature = (
  fastify,
  options
) => {
  fastify.post(
    "/",
    {
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
      config: {
        public: options?.public ?? false,
        allowAnonymousAccess: options?.allowAnonymousAccess ?? false,
      },
    },
    createSubcategoryRecommendationHandler
  );
};
