import { getSubcategoriesRankingHandler } from "./handler.js";
import {
  GetSubcategoriesRankingParams,
  GetSubcategoriesRankingParamsSchema,
  GetSubcategoriesRankingResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { StandardRouteSignature } from "@/routes/api/index.js";
import { extractCarbonInventoryIdFromParams } from "../carbonInventoryIdExtractors.js";

export const getSubcategoriesRankingRoute: StandardRouteSignature = (
  fastify,
  options
) => {
  fastify.get<{ Params: GetSubcategoriesRankingParams }>(
    "/:id/subcategories-ranking",
    {
      schema: {
        tags: ["carbon-inventories"],
        summary: "Get subcategories ranking",
        description:
          "Retrieves subcategories ranked by descending emissions for the organization's own carbon inventory.",
        params: GetSubcategoriesRankingParamsSchema,
        response: {
          200: GetSubcategoriesRankingResponseSchema,
          404: ApiErrorResponseSchema,
        },
      },
      config: {
        public: options?.public ?? false,
      },
      preHandler: [
        fastify.requireCarbonInventoryAccess(
          extractCarbonInventoryIdFromParams
        ),
      ],
    },
    getSubcategoriesRankingHandler
  );
};
