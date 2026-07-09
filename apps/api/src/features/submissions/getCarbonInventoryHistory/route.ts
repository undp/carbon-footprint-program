import { getCarbonInventoryHistoryHandler } from "./handler.js";
import {
  GetCarbonInventoryHistoryParams,
  GetCarbonInventoryHistoryParamsSchema,
  GetCarbonInventoryHistoryResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { defineRoute } from "@/routing/defineRoute.js";

export const getCarbonInventoryHistoryRoute = defineRoute<{
  Params: GetCarbonInventoryHistoryParams;
}>({
  method: "GET",
  path: "/carbon-inventory/:id/history",
  schema: {
    tags: ["submissions"],
    summary: "Get carbon inventory submission history",
    description:
      "Get the history of submissions for a specific carbon inventory.",
    params: GetCarbonInventoryHistoryParamsSchema,
    response: {
      200: GetCarbonInventoryHistoryResponseSchema,
      503: ApiErrorResponseSchema,
    },
  },
  access: {
    mode: "private",
    domain: {
      kind: "carbonInventory",
      options: { canAdminsBypass: true },
    },
  },
  handler: getCarbonInventoryHistoryHandler,
});
