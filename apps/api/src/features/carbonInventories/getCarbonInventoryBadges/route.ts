import {
  GetCarbonInventoryBadgesParamsSchema,
  GetCarbonInventoryBadgesResponseSchema,
  type GetCarbonInventoryBadgesParams,
} from "@repo/types";
import { getCarbonInventoryBadgesHandler } from "./handler.js";
import { StandardRouteSignature } from "@/routes/api/index.js";
import { extractCarbonInventoryIdFromParams } from "../carbonInventoryIdExtractors.js";

export const getCarbonInventoryBadgesRoute: StandardRouteSignature = (
  fastify,
  _options
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
        },
      },
      preHandler: [
        fastify.requireCarbonInventoryAccess(
          extractCarbonInventoryIdFromParams
        ),
      ],
    },
    getCarbonInventoryBadgesHandler
  );
};
