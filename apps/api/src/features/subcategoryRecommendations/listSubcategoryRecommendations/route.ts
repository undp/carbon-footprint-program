import type { FastifyZodInstance } from "@/types/fastify.js";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { ListSubcategoryRecommendationsResponseSchema } from "@repo/types";
import { listSubcategoryRecommendationsHandler } from "./handler.js";

export const listSubcategoryRecommendationsRoute = (
  fastify: FastifyZodInstance
): void => {
  fastify.get(
    "/",
    {
      schema: {
        tags: ["subcategory-recommendations"],
        summary: "List subcategory recommendations grouped by sector/subsector",
        response: {
          200: ListSubcategoryRecommendationsResponseSchema,
          500: ApiErrorResponseSchema,
        },
      },
    },
    listSubcategoryRecommendationsHandler
  );
};
