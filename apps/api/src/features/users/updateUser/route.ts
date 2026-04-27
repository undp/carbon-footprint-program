import type { FastifyZodInstance } from "@/types/fastify.js";
import { updateUserHandler } from "./handler.js";
import {
  UpdateUserParamsSchema,
  UpdateUserBodySchema,
  UpdateUserResponseSchema,
  UpdateUserBody,
  UpdateUserParams,
  UpdateUserResponse,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";

export const updateUserRoute = (fastify: FastifyZodInstance) => {
  fastify.patch<{
    Params: UpdateUserParams;
    Body: UpdateUserBody;
    Reply: UpdateUserResponse;
  }>(
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
          400: ApiErrorResponseSchema,
          403: ApiErrorResponseSchema,
          404: ApiErrorResponseSchema,
          409: ApiErrorResponseSchema,
          422: ApiErrorResponseSchema,
        },
      },
      preHandler: [fastify.requireAuth],
    },
    updateUserHandler
  );
};
