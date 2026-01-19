import type { FastifyZodInstance } from "@/types/fastify.js";
import { updateUserHandler } from "./updateUserHandler.js";
import {
  UpdateUserParamsSchema,
  UpdateUserBodySchema,
  UpdateUserResponseSchema,
} from "@repo/types";
import {
  NotFoundErrorResponseSchema,
  StructuredErrorResponseSchema,
  ValidationErrorResponseSchema,
} from "@/commonSchemas/errors.js";

export const updateUserRoute = (fastify: FastifyZodInstance) => {
  fastify.patch(
    "/:id",
    {
      schema: {
        tags: ["users"],
        summary: "Update a user",
        description: "Update an existing user by their ID",
        params: UpdateUserParamsSchema,
        body: UpdateUserBodySchema,
        response: {
          200: UpdateUserResponseSchema,
          400: ValidationErrorResponseSchema,
          404: NotFoundErrorResponseSchema,
          422: StructuredErrorResponseSchema,
        },
      },
    },
    updateUserHandler
  );
};
