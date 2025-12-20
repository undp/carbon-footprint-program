import type { FastifyZodInstance } from "@/types/fastify.js";
import { updateCarbonInventoryHandler } from "./updateCarbonInventoryHandler.js";
import {
  UpdateCarbonInventoryParamsSchema,
  UpdateCarbonInventoryRequestSchema,
  UpdateCarbonInventoryResponseSchema,
} from "@repo/types";
import {
  NotFoundErrorResponseSchema,
  ValidationErrorResponseSchema,
} from "@/commonSchemas/errors.js";

export const updateCarbonInventoryRoute = (fastify: FastifyZodInstance) => {
  fastify.put(
    "/:id",
    {
      schema: {
        tags: ["carbon-inventories"],
        summary: "Update a carbon inventory",
        description: "Update a carbon inventory by ID",
        params: UpdateCarbonInventoryParamsSchema,
        body: UpdateCarbonInventoryRequestSchema,
        response: {
          200: UpdateCarbonInventoryResponseSchema,
          400: ValidationErrorResponseSchema,
          404: NotFoundErrorResponseSchema,
        },
      },
    },
    updateCarbonInventoryHandler
  );
};

