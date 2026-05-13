import { getEmissionsDetailedSummaryHandler } from "./handler.js";
import {
  GetEmissionsDetailedSummaryParams,
  GetEmissionsDetailedSummaryParamsSchema,
  GetEmissionsDetailedSummaryResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { defineRoute } from "@/routing/defineRoute.js";

export const getEmissionsDetailedSummaryRoute = defineRoute<{
  Params: GetEmissionsDetailedSummaryParams;
}>({
  method: "GET",
  path: "/:id/emissions-summary",
  schema: {
    tags: ["carbon-inventories"],
    summary: "Get full emissions summary for inventory review",
    description:
      "Retrieves comprehensive emissions summary including inventory attributes, category/subcategory breakdown with emission lines, GHG gas breakdown, and equivalence data.",
    params: GetEmissionsDetailedSummaryParamsSchema,
    response: {
      200: GetEmissionsDetailedSummaryResponseSchema,
      403: ApiErrorResponseSchema,
      404: ApiErrorResponseSchema,
    },
  },
  access: {
    mode: "anonymous",
    carbonInventory: { canAdminsBypass: true },
  },
  handler: getEmissionsDetailedSummaryHandler,
});
