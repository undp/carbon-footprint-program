import {
  GetCarbonInventoryBadgesParams,
  GetCarbonInventoryBadgesParamsSchema,
  GetCarbonInventoryBadgesResponseSchema,
} from "@repo/types";
import { getCarbonInventoryBadgesHandler } from "./handler.js";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { defineRoute } from "@/routing/defineRoute.js";

export const getCarbonInventoryBadgesRoute = defineRoute<{
  Params: GetCarbonInventoryBadgesParams;
}>({
  method: "GET",
  path: "/:id/badges",
  schema: {
    tags: ["carbon-inventory-badges"],
    summary: "Get carbon inventory badges",
    params: GetCarbonInventoryBadgesParamsSchema,
    description:
      "Get all badges associated with a carbon inventory. Only inventories with VERIFIED or SUBMITTED status will have badges.",
    response: {
      200: GetCarbonInventoryBadgesResponseSchema,
      403: ApiErrorResponseSchema,
    },
  },
  access: {
    mode: "private",
    domain: { kind: "carbonInventory" },
  },
  handler: getCarbonInventoryBadgesHandler,
});
