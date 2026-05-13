import { getSubcategoriesRankingHandler } from "./handler.js";
import {
  GetSubcategoriesRankingParams,
  GetSubcategoriesRankingParamsSchema,
  GetSubcategoriesRankingResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { defineRoute } from "@/routing/defineRoute.js";

export const getSubcategoriesRankingRoute = defineRoute<{
  Params: GetSubcategoriesRankingParams;
}>({
  method: "GET",
  path: "/:id/subcategories-ranking",
  schema: {
    tags: ["carbon-inventories"],
    summary: "Get subcategories ranking",
    description:
      "Retrieves subcategories ranked by descending emissions for the organization's own carbon inventory.",
    params: GetSubcategoriesRankingParamsSchema,
    response: {
      200: GetSubcategoriesRankingResponseSchema,
      403: ApiErrorResponseSchema,
      404: ApiErrorResponseSchema,
    },
  },
  access: {
    mode: "anonymous",
    carbonInventory: { canAdminsBypass: true },
  },
  handler: getSubcategoriesRankingHandler,
});
