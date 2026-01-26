import type { FastifyZodInstance } from "@/types/fastify.js";
import { syncCarbonInventoryLinesHandler } from "./syncCarbonInventoryLinesHandler.js";
import {
  IdSchema,
  SyncCarbonInventoryLinesRequestSchema,
  SyncCarbonInventoryLinesResponseSchema,
} from "@repo/types";
import {
  ValidationErrorResponseSchema,
  NotFoundErrorResponseSchema,
  StructuredErrorResponseSchema,
} from "@/commonSchemas/errors.js";
import { z } from "zod";

const SyncCarbonInventoryLinesParamsSchema = z.object({
  id: IdSchema.describe("The carbon inventory ID"),
});

export const syncCarbonInventoryLinesRoute = (fastify: FastifyZodInstance) => {
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
          400: ValidationErrorResponseSchema,
          404: NotFoundErrorResponseSchema,
          422: StructuredErrorResponseSchema,
        },
      },
    },
    syncCarbonInventoryLinesHandler
  );
};
