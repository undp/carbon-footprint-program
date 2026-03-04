import {
  GetCarbonInventoryBadgesParamsSchema,
  GetCarbonInventoryBadgesResponseSchema,
} from "@repo/types";
import { getCarbonInventoryBadgesHandler } from "./handler.js";
import { StandardRouteSignature } from "@/routes/api/index.js";
import { ApiErrorResponseSchema } from "../../../commonSchemas/errors.js";

export const getCarbonInventoryBadgesRoute: StandardRouteSignature = (
  fastify
) => {
  fastify.get(
    "/:id/badges",
    {
      schema: {
        tags: ["carbon-inventory-badges"],
        summary: "Get carbon inventory badges",
        params: GetCarbonInventoryBadgesParamsSchema,
        description:
          "Get all badges associated with a specific carbon inventory ordered by creation date (newest first).",
        response: {
          200: GetCarbonInventoryBadgesResponseSchema,
          404: ApiErrorResponseSchema,
        },
      },
    },
    getCarbonInventoryBadgesHandler
  );
};
