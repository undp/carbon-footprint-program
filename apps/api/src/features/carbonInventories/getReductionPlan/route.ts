import { getReductionPlanHandler } from "./handler.js";
import {
  GetReductionPlanParams,
  GetReductionPlanParamsSchema,
  GetReductionPlanResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { defineRoute } from "@/routing/defineRoute.js";

export const getReductionPlanRoute = defineRoute<{
  Params: GetReductionPlanParams;
}>({
  method: "GET",
  path: "/:id/reduction-plan",
  schema: {
    tags: ["carbon-inventories"],
    summary: "Get reduction plan by category",
    description:
      "Retrieves initiatives grouped by subcategory for a carbon inventory's reduction plan.",
    params: GetReductionPlanParamsSchema,
    response: {
      200: GetReductionPlanResponseSchema,
      403: ApiErrorResponseSchema,
      404: ApiErrorResponseSchema,
    },
  },
  access: {
    mode: "private",
    domain: { kind: "carbonInventory" },
  },
  handler: getReductionPlanHandler,
});
