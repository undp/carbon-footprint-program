import type { FastifyZodInstance } from "@/types/fastify.js";
import { deleteUserHandler } from "./handler.js";
import { DeleteUserParamsSchema, DeleteUserResponseSchema } from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";

export const deleteUserRoute = (fastify: FastifyZodInstance) => {
  fastify.delete(
    "/:id",
    {
      schema: {
        tags: ["users"],
        summary: "Delete a user",
        description: "Delete an existing user by their ID",
        params: DeleteUserParamsSchema,
        response: {
          200: DeleteUserResponseSchema,
          404: ApiErrorResponseSchema,
        },
      },
    },
    deleteUserHandler
  );
};
