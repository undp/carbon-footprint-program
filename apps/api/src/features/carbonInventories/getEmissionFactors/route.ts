import { getEmissionFactorsHandler } from "./handler.js";
import {
  GetEmissionFactorsParams,
  GetEmissionFactorsParamsSchema,
  GetEmissionFactorsResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { defineRoute } from "@/routing/defineRoute.js";

export const getEmissionFactorsRoute = defineRoute<{
  Params: GetEmissionFactorsParams;
}>({
  method: "GET",
  path: "/:id/emission-factors",
  schema: {
    tags: ["carbon-inventories"],
    summary: "Get emission factors used in inventory",
    description:
      "Retrieves all emission factors used in the inventory, including category/subcategory info, activity parameters, gas breakdown, and factor sources.",
    params: GetEmissionFactorsParamsSchema,
    response: {
      200: GetEmissionFactorsResponseSchema,
      403: ApiErrorResponseSchema,
      404: ApiErrorResponseSchema,
    },
  },
  access: {
    mode: "anonymous",
    options: { canAdminsBypass: true },
  },
  handler: getEmissionFactorsHandler,
});
