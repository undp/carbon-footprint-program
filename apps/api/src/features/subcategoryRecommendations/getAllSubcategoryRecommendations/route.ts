import { StandardRouteSignature } from "@/routes/api/index.js";
import {
  GetAllSubcategoryRecommendationsQuerySchema,
  GetAllSubcategoryRecommendationsResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { getAllSubcategoryRecommendationsHandler } from "./handler.js";

export const getAllSubcategoryRecommendationsRoute: StandardRouteSignature = (
  fastify,
  options
) => {
  fastify.get(
    "/",
    {
      schema: {
        tags: ["subcategory-recommendations"],
        summary:
          "Get all subcategory recommendations grouped by sector/subsector",
        description:
          "Returns ACTIVE recommendations grouped by (sectorId, subsectorId) and scoped to the given methodology version.",
        querystring: GetAllSubcategoryRecommendationsQuerySchema,
        response: {
          200: GetAllSubcategoryRecommendationsResponseSchema,
          400: ApiErrorResponseSchema,
          401: ApiErrorResponseSchema,
          403: ApiErrorResponseSchema,
        },
      },
      config: {
        public: options?.public ?? false,
        allowAnonymousAccess: options?.allowAnonymousAccess ?? false,
      },
    },
    getAllSubcategoryRecommendationsHandler
  );
};
