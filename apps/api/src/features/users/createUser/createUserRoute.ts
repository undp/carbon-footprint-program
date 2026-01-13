import type { FastifyZodInstance } from "@/types/fastify.js";
import { createUserHandler } from "./createUserHandler.js";
import { CreateUserBodySchema, CreateUserResponseSchema } from "@repo/types";
import {
  StructuredErrorResponseSchema,
  ValidationErrorResponseSchema,
} from "@/commonSchemas/errors.js";

export const createUserRoute = (fastify: FastifyZodInstance) => {
  fastify.post(
    "/",
    {
      schema: {
        tags: ["users"],
        summary: "Create a new user",
        description: "Create a new user in the system",
        body: CreateUserBodySchema,
        response: {
          201: CreateUserResponseSchema,
          400: ValidationErrorResponseSchema,
          422: StructuredErrorResponseSchema,
        },
      },
    },
    createUserHandler
  );
};
