import {
  GetCarbonInventoryBadgesParamsSchema,
  GetCarbonInventoryBadgesResponseSchema,
  type GetCarbonInventoryBadgesParams,
} from "@repo/types";
import { getCarbonInventoryBadgesHandler } from "./handler.js";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { StandardRouteSignature } from "@/routes/api/index.js";
import { idRequestExtractor } from "@/helpers/idRequestExtractor.js";

export const getCarbonInventoryBadgesRoute: StandardRouteSignature = (
  fastify,
  options
) => {
  fastify.get<{ Params: GetCarbonInventoryBadgesParams }>(
    "/:id/badges",
    {
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
      config: {
        allowPublicAccess: options?.allowPublicAccess ?? false,
        allowAnonymousAccess: options?.allowAnonymousAccess ?? false,
      },
      preHandler: [fastify.requireCarbonInventoryAccess(idRequestExtractor)],
    },
    getCarbonInventoryBadgesHandler
  );
};
