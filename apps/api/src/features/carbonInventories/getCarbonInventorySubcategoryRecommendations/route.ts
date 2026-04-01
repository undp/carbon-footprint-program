import { getCarbonInventorySubcategoryRecommendationsHandler } from "./handler.js";
import {
  GetCarbonInventorySubcategoryRecommendationsParams,
  GetCarbonInventorySubcategoryRecommendationsParamsSchema,
  GetCarbonInventorySubcategoryRecommendationsResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { StandardRouteSignature } from "@/routes/api/index.js";
import { extractCarbonInventoryIdFromParams } from "../carbonInventoryIdExtractors.js";

export const getCarbonInventorySubcategoryRecommendationsRoute: StandardRouteSignature =
  (fastify, options) => {
    fastify.get<{
      Params: GetCarbonInventorySubcategoryRecommendationsParams;
    }>(
      "/:id/subcategory-recommendations",
      {
        schema: {
          tags: ["carbon-inventories"],
          summary: "Get subcategory recommendations for carbon inventory",
          description:
            "Returns the list of subcategory IDs recommended for the inventory's organization sector and subsector.",
          params: GetCarbonInventorySubcategoryRecommendationsParamsSchema,
          response: {
            200: GetCarbonInventorySubcategoryRecommendationsResponseSchema,
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
      getCarbonInventorySubcategoryRecommendationsHandler
    );
  };
