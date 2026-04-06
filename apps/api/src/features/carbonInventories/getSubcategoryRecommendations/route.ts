import { getSubcategoryRecommendationsHandler } from "./handler.js";
import {
  GetSubcategoryRecommendationsParams,
  GetSubcategoryRecommendationsParamsSchema,
  GetSubcategoryRecommendationsResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { StandardRouteSignature } from "@/routes/api/index.js";
import { extractCarbonInventoryIdFromParams } from "../carbonInventoryIdExtractors.js";

export const getSubcategoryRecommendationsRoute: StandardRouteSignature = (
  fastify,
  options
) => {
  fastify.get<{
    Params: GetSubcategoryRecommendationsParams;
  }>(
    "/:id/subcategory-recommendations",
    {
      schema: {
        tags: ["carbon-inventories"],
        summary: "Get subcategory recommendations for carbon inventory",
        description:
          "Returns the list of subcategory IDs recommended for the inventory's organization sector and subsector.",
        params: GetSubcategoryRecommendationsParamsSchema,
        response: {
          200: GetSubcategoryRecommendationsResponseSchema,
          400: ApiErrorResponseSchema,
          403: ApiErrorResponseSchema,
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
    getSubcategoryRecommendationsHandler
  );
};
