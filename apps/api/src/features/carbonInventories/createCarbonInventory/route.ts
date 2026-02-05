import type { FastifyZodInstance } from "@/types/fastify.js";
import { createCarbonInventoryHandler } from "./handler.js";
import {
  CreateCarbonInventoryRequestSchema,
  CreateCarbonInventoryResponseSchema,
} from "@repo/types";
import {
  ValidationErrorResponseSchema,
  StructuredErrorResponseSchema,
} from "@/commonSchemas/errors.js";

export const createCarbonInventoryRoute = (fastify: FastifyZodInstance) => {
  fastify.post(
    "/",
    {
      schema: {
        tags: ["carbon-inventories"],
        summary: "Create a new carbon inventory",
        description: "Create a new carbon inventory with the provided data",
        body: CreateCarbonInventoryRequestSchema,
        response: {
          201: CreateCarbonInventoryResponseSchema,
          400: ValidationErrorResponseSchema,
          422: StructuredErrorResponseSchema,
        },
      },
    },
    createCarbonInventoryHandler
  );
};
