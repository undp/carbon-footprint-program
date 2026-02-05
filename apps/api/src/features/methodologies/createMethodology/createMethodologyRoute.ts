import type { FastifyZodInstance } from "@/types/fastify.js";
import { createMethodologyHandler } from "./createMethodologyHandler.js";
import {
  CreateMethodologyRequestSchema,
  CreateMethodologyResponseSchema,
} from "@repo/types";
import {
  ValidationErrorResponseSchema,
  StructuredErrorResponseSchema,
} from "@/commonSchemas/errors.js";

export const createMethodologyRoute = (fastify: FastifyZodInstance) => {
  fastify.post(
    "/",
    {
      schema: {
        tags: ["methodologies"],
        summary: "Create a new methodology",
        description: "Create a new methodology version for a country",
        body: CreateMethodologyRequestSchema,
        response: {
          201: CreateMethodologyResponseSchema,
          400: ValidationErrorResponseSchema,
          409: StructuredErrorResponseSchema,
        },
      },
    },
    createMethodologyHandler
  );
};
