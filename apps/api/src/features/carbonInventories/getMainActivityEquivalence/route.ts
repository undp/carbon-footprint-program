import { getMainActivityEquivalenceHandler } from "./handler.js";
import {
  GetMainActivityEquivalenceParams,
  GetMainActivityEquivalenceParamsSchema,
  GetMainActivityEquivalenceResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { defineRoute } from "@/routing/defineRoute.js";

export const getMainActivityEquivalenceRoute = defineRoute<{
  Params: GetMainActivityEquivalenceParams;
}>({
  method: "GET",
  path: "/:id/main-activity-equivalence",
  schema: {
    tags: ["carbon-inventories"],
    summary: "Get main activity equivalence",
    description:
      "Retrieves the emission rate per main activity unit for a carbon inventory. Returns null if main activity data is not defined.",
    params: GetMainActivityEquivalenceParamsSchema,
    response: {
      200: GetMainActivityEquivalenceResponseSchema,
      403: ApiErrorResponseSchema,
      404: ApiErrorResponseSchema,
    },
  },
  access: {
    mode: "anonymous",
    carbonInventory: { canAdminsBypass: true },
  },
  handler: getMainActivityEquivalenceHandler,
});
