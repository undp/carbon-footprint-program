import { syncCarbonInventoryLinesHandler } from "./handler.js";
import {
  IdSchema,
  SyncCarbonInventoryLinesRequestSchema,
  SyncCarbonInventoryLinesResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { z } from "zod";
import { StandardRouteSignature } from "@/routes/api/index.js";

const SyncCarbonInventoryLinesParamsSchema = z.object({
  id: IdSchema.describe("The carbon inventory ID"),
});

export const syncCarbonInventoryLinesRoute: StandardRouteSignature = (
  fastify,
  options
) => {
  fastify.post(
    "/:id/lines/sync",
    {
      schema: {
        tags: ["carbon-inventories"],
        summary: "Sync carbon inventory lines (create, update, delete)",
        description:
          "Synchronize lines in a carbon inventory. This endpoint allows creating new lines, updating existing lines, and deleting lines in a single atomic operation.",
        params: SyncCarbonInventoryLinesParamsSchema,
        body: SyncCarbonInventoryLinesRequestSchema,
        response: {
          200: SyncCarbonInventoryLinesResponseSchema,
          400: ApiErrorResponseSchema,
          404: ApiErrorResponseSchema,
          422: ApiErrorResponseSchema,
        },
      },
      config: {
        public: options?.public ?? false,
      },
    },
    syncCarbonInventoryLinesHandler
  );
};
