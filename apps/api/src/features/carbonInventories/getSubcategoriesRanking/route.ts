import { getSubcategoriesRankingHandler } from "./handler.js";
import { IdSchema, GetSubcategoriesRankingResponseSchema } from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { z } from "zod";
import { StandardRouteSignature } from "@/routes/api/index.js";

const ParamsSchema = z.object({
  id: IdSchema.describe("The carbon inventory ID"),
});

export const getSubcategoriesRankingRoute: StandardRouteSignature = (
  fastify,
  options
) => {
  fastify.get(
    "/:id/subcategories-ranking",
    {
      schema: {
        tags: ["carbon-inventories"],
        summary: "Get subcategories ranking",
        description:
          "Retrieves subcategories ranked by descending emissions for the organization's own carbon inventory.",
        params: ParamsSchema,
        response: {
          200: GetSubcategoriesRankingResponseSchema,
          404: ApiErrorResponseSchema,
        },
      },
      config: {
        public: options?.public ?? false,
      },
    },
    getSubcategoriesRankingHandler
  );
};
