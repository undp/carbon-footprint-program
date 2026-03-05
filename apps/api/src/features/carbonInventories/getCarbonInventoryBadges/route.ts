import {
  GetCarbonInventoryBadgesParamsSchema,
  GetCarbonInventoryBadgesResponseSchema,
} from "@repo/types";
import { getCarbonInventoryBadgesHandler } from "./handler.js";
import { StandardRouteSignature } from "@/routes/api/index.js";

export const getCarbonInventoryBadgesRoute: StandardRouteSignature = (
  fastify,
  _options
) => {
  fastify.get(
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
    },
    getCarbonInventoryBadgesHandler
  );
};
