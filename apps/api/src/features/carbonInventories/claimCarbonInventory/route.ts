import { claimCarbonInventoryHandler } from "./handler.js";
import {
  ClaimCarbonInventoryParams,
  ClaimCarbonInventoryParamsSchema,
  ClaimCarbonInventoryResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { defineRoute } from "@/routing/defineRoute.js";

export const claimCarbonInventoryRoute = defineRoute<{
  Params: ClaimCarbonInventoryParams;
}>({
  method: "POST",
  path: "/:id/claim",
  schema: {
    tags: ["carbon-inventories"],
    summary: "Claim an anonymous carbon inventory",
    description:
      "Associates an anonymous carbon inventory to the authenticated user. Requires the x-carbon-inventory-uuid header to prove ownership. Fails if the inventory already has a user or organization.",
    params: ClaimCarbonInventoryParamsSchema,
    response: {
      200: ClaimCarbonInventoryResponseSchema,
      400: ApiErrorResponseSchema,
      404: ApiErrorResponseSchema,
    },
  },
  access: { mode: "private" },
  handler: claimCarbonInventoryHandler,
});
