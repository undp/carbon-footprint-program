import { getEmissionsSummaryCategoriesHandler } from "./handler.js";
import {
  GetEmissionsSummaryCategoriesParams,
  GetEmissionsSummaryCategoriesParamsSchema,
  GetEmissionsSummaryCategoriesResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { defineRoute } from "@/routing/defineRoute.js";

export const getEmissionsSummaryCategoriesRoute = defineRoute<{
  Params: GetEmissionsSummaryCategoriesParams;
}>({
  method: "GET",
  path: "/:id/emissions-summary/categories",
  schema: {
    tags: ["carbon-inventories"],
    summary: "Get emissions summary by category",
    description:
      "Retrieves emissions totals and percentages grouped by category and subcategory for a carbon inventory.",
    params: GetEmissionsSummaryCategoriesParamsSchema,
    response: {
      200: GetEmissionsSummaryCategoriesResponseSchema,
      403: ApiErrorResponseSchema,
      404: ApiErrorResponseSchema,
    },
  },
  access: {
    mode: "anonymous",
    carbonInventory: { canAdminsBypass: true },
  },
  handler: getEmissionsSummaryCategoriesHandler,
});
