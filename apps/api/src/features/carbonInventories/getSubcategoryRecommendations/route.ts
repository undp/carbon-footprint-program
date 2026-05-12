import { getSubcategoryRecommendationsHandler } from "./handler.js";
import {
  GetSubcategoryRecommendationsParams,
  GetSubcategoryRecommendationsParamsSchema,
  GetSubcategoryRecommendationsResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { StandardRouteSignature } from "@/routes/api/index.js";
import { idRequestExtractor } from "@/helpers/idRequestExtractor.js";

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
        allowPublicAccess: options?.allowPublicAccess ?? false,
        allowAnonymousAccess: options?.allowAnonymousAccess ?? false,
      },
      preHandler: [fastify.requireCarbonInventoryAccess(idRequestExtractor)],
    },
    getSubcategoryRecommendationsHandler
  );
};
