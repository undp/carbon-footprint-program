import type { FastifyZodInstance } from "@/types/fastify.js";
import { GetAllSubcategoryRecommendationsResponseSchema } from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { getAllSubcategoryRecommendationsHandler } from "./handler.js";

export const getAllSubcategoryRecommendationsRoute = (
  fastify: FastifyZodInstance
) => {
  fastify.get(
    "/",
    {
      schema: {
        tags: ["subcategory-recommendations"],
        summary:
          "Get all subcategory recommendations grouped by sector/subsector",
        description:
          "Returns ACTIVE recommendations grouped by (sectorId, subsectorId).",
        response: {
          200: GetAllSubcategoryRecommendationsResponseSchema,
          401: ApiErrorResponseSchema,
          403: ApiErrorResponseSchema,
        },
      },
    },
    getAllSubcategoryRecommendationsHandler
  );
};
