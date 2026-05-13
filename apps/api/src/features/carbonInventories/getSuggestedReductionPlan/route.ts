import { getSuggestedReductionPlanHandler } from "./handler.js";
import {
  GetSuggestedReductionPlanParams,
  GetSuggestedReductionPlanParamsSchema,
  GetSuggestedReductionPlanQuery,
  GetSuggestedReductionPlanQuerySchema,
  GetSuggestedReductionPlanResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { defineRoute } from "@/routing/defineRoute.js";

export const getSuggestedReductionPlanRoute = defineRoute<{
  Params: GetSuggestedReductionPlanParams;
  Querystring: GetSuggestedReductionPlanQuery;
}>({
  method: "GET",
  path: "/:id/suggested-reduction-plan",
  schema: {
    tags: ["carbon-inventories"],
    summary: "Get suggested reduction plan",
    description:
      "Retrieves the top N reduction initiatives for a carbon inventory, ranked by the emissions contribution of each initiative's subcategory.",
    params: GetSuggestedReductionPlanParamsSchema,
    querystring: GetSuggestedReductionPlanQuerySchema,
    response: {
      200: GetSuggestedReductionPlanResponseSchema,
      403: ApiErrorResponseSchema,
      404: ApiErrorResponseSchema,
    },
  },
  access: {
    mode: "anonymous",
    carbonInventory: { canAdminsBypass: true },
  },
  handler: getSuggestedReductionPlanHandler,
});
