import { syncCarbonInventoryLinesHandler } from "./handler.js";
import {
  SyncCarbonInventoryLinesRequestSchema,
  SyncCarbonInventoryLinesResponseSchema,
  SyncCarbonInventoryLinesParamsSchema,
  type SyncCarbonInventoryLinesRequest,
  type SyncCarbonInventoryLinesParams,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { StandardRouteSignature } from "@/routes/api/index.js";
import type { FastifyRequest } from "fastify";

const extractCarbonInventoryId = async (request: FastifyRequest) =>
  Promise.resolve((request.params as SyncCarbonInventoryLinesParams).id);

export const syncCarbonInventoryLinesRoute: StandardRouteSignature = (
  fastify,
  options
) => {
  fastify.post<{
    Params: SyncCarbonInventoryLinesParams;
    Body: SyncCarbonInventoryLinesRequest;
  }>(
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
      preHandler: [fastify.requireEditableInventory(extractCarbonInventoryId)],
      config: {
        public: options?.public ?? false,
      },
    },
    syncCarbonInventoryLinesHandler
  );
};
