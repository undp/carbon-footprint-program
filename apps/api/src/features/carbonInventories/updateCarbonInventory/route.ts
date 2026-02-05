import type { FastifyZodInstance } from "@/types/fastify.js";
import { updateCarbonInventoryHandler } from "./handler.js";
import {
  IdSchema,
  UpdateCarbonInventoryRequestSchema,
  UpdateCarbonInventoryResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { z } from "zod";

const UpdateCarbonInventoryParamsSchema = z.object({
  id: IdSchema.describe("The carbon inventory ID"),
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
          400: ApiErrorResponseSchema,
          404: ApiErrorResponseSchema,
        },
      },
    },
    updateCarbonInventoryHandler
  );
};
