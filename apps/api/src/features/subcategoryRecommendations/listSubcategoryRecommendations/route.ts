import type { FastifyZodInstance } from "@/types/fastify.js";
import { ListSubcategoryRecommendationsResponseSchema } from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { listSubcategoryRecommendationsHandler } from "./handler.js";

export const listSubcategoryRecommendationsRoute = (
  fastify: FastifyZodInstance
) => {
  fastify.get(
    "/",
    {
      schema: {
        tags: ["subcategory-recommendations"],
        summary: "List subcategory recommendations grouped by sector/subsector",
        description:
          "Returns ACTIVE recommendations grouped by (sectorId, subsectorId).",
        response: {
          200: ListSubcategoryRecommendationsResponseSchema,
          401: ApiErrorResponseSchema,
          403: ApiErrorResponseSchema,
        },
      },
    },
    listSubcategoryRecommendationsHandler
  );
};
