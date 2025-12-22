import type { FastifyZodInstance } from "@/types/fastify.js";
import { updateCarbonInventoryHandler } from "./updateCarbonInventoryHandler.js";
import {
  UpdateCarbonInventoryRequestSchema,
  UpdateCarbonInventoryResponseSchema,
} from "@repo/types";
import {
  ValidationErrorResponseSchema,
  NotFoundErrorResponseSchema,
} from "@/commonSchemas/errors.js";
import { z } from "zod";

const UpdateCarbonInventoryParamsSchema = z.object({
  id: z.string().regex(/^\d+$/),
});

export const updateCarbonInventoryRoute = (fastify: FastifyZodInstance) => {
  fastify.patch(
    "/:id",
    {
      schema: {
        tags: ["carbon-inventories"],
        summary: "Update a carbon inventory",
        description:
          "Update any attributes of an existing carbon inventory by ID",
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
