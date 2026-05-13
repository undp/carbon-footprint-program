import { getSubcategoryRecommendationsHandler } from "./handler.js";
import {
  GetSubcategoryRecommendationsParams,
  GetSubcategoryRecommendationsParamsSchema,
  GetSubcategoryRecommendationsResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { defineRoute } from "@/routing/defineRoute.js";

export const getSubcategoryRecommendationsRoute = defineRoute<{
  Params: GetSubcategoryRecommendationsParams;
}>({
  method: "GET",
  path: "/:id/subcategory-recommendations",
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
  access: {
    mode: "anonymous",
    carbonInventory: {},
  },
  handler: getSubcategoryRecommendationsHandler,
});
