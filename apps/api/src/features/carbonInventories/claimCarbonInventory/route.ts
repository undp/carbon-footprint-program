import { claimCarbonInventoryHandler } from "./handler.js";
import {
  ClaimCarbonInventoryParamsSchema,
  ClaimCarbonInventoryResponseSchema,
  type ClaimCarbonInventoryParams,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { StandardRouteSignature } from "@/routes/api/index.js";

export const claimCarbonInventoryRoute: StandardRouteSignature = (
  fastify,
  options
) => {
  fastify.post<{ Params: ClaimCarbonInventoryParams }>(
    "/:id/claim",
    {
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
      config: {
        public: options?.public ?? false,
        allowAnonymousAccess: options?.allowAnonymousAccess ?? false,
      },
    },
    claimCarbonInventoryHandler
  );
};
