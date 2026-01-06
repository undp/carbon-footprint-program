import type { FastifyZodInstance } from "@/types/fastify.js";
import { updateCarbonInventoryLinesHandler } from "./updateCarbonInventoryLinesHandler.js";
import {
  IdSchema,
  UpdateCarbonInventoryLinesRequestSchema,
  UpdateCarbonInventoryLinesResponseSchema,
} from "@repo/types";
import {
  ValidationErrorResponseSchema,
  NotFoundErrorResponseSchema,
  StructuredErrorResponseSchema,
} from "@/commonSchemas/errors.js";
import { z } from "zod";

const UpdateCarbonInventoryLinesParamsSchema = z.object({
  id: IdSchema.describe("The carbon inventory ID"),
});

export const updateCarbonInventoryLinesRoute = (
  fastify: FastifyZodInstance
) => {
  fastify.patch(
    "/:id/lines",
    {
      schema: {
        tags: ["carbon-inventories"],
        summary: "Update one or multiple carbon inventory lines",
        description:
          "Update one or multiple lines in a carbon inventory. Each update creates a new active input and marks the old input as outdated for full traceability.",
        params: UpdateCarbonInventoryLinesParamsSchema,
        body: UpdateCarbonInventoryLinesRequestSchema,
        response: {
          200: UpdateCarbonInventoryLinesResponseSchema,
          400: ValidationErrorResponseSchema,
          404: NotFoundErrorResponseSchema,
          422: StructuredErrorResponseSchema,
        },
      },
    },
    updateCarbonInventoryLinesHandler
  );
};
