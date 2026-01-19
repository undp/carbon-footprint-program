import type { FastifyZodInstance } from "@/types/fastify.js";
import { getUserByIdHandler } from "./getUserByIdHandler.js";
import {
  GetUserByIdParamsSchema,
  GetUserByIdResponseSchema,
} from "@repo/types";
import { NotFoundErrorResponseSchema } from "@/commonSchemas/errors.js";

export const getUserByIdRoute = (fastify: FastifyZodInstance) => {
  fastify.get(
    "/:id",
    {
      schema: {
        tags: ["users"],
        summary: "Get user by ID",
        description: "Get a specific user by their ID",
        params: GetUserByIdParamsSchema,
        response: {
          200: GetUserByIdResponseSchema,
          404: NotFoundErrorResponseSchema,
        },
      },
    },
    getUserByIdHandler
  );
};
