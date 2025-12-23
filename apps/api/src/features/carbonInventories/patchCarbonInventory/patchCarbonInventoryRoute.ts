import type { FastifyZodInstance } from "@/types/fastify.js";
import { patchCarbonInventoryHandler } from "./patchCarbonInventoryHandler.js";
import {
  UpdateCarbonInventoryRequestSchema,
  UpdateCarbonInventoryResponseSchema,
} from "@repo/types";
import {
  ValidationErrorResponseSchema,
  NotFoundErrorResponseSchema,
} from "@/commonSchemas/errors.js";
import { z } from "zod";

const PatchCarbonInventoryParamsSchema = z.object({
  id: z.string().regex(/^\d+$/),
});

export const patchCarbonInventoryRoute = (fastify: FastifyZodInstance) => {
  fastify.patch(
    "/:id",
    {
      schema: {
        tags: ["carbon-inventories"],
        summary: "Update a carbon inventory",
        description:
          "Update any attributes of an existing carbon inventory by ID",
        params: PatchCarbonInventoryParamsSchema,
        body: UpdateCarbonInventoryRequestSchema,
        response: {
          200: UpdateCarbonInventoryResponseSchema,
          400: ValidationErrorResponseSchema,
          404: NotFoundErrorResponseSchema,
        },
      },
    },
    patchCarbonInventoryHandler
  );
};
