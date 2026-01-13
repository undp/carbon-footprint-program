import type { FastifyZodInstance } from "@/types/fastify.js";
import { getAllUsersHandler } from "./getAllUsersHandler.js";
import { GetAllUsersResponseSchema } from "@repo/types";
import { NotFoundErrorResponseSchema } from "@/commonSchemas/errors.js";

export const getAllUsersRoute = (fastify: FastifyZodInstance) => {
  fastify.get(
    "/",
    {
      schema: {
        tags: ["users"],
        summary: "Get all users",
        description: "Get all users ordered by creation date (newest first)",
        response: {
          200: GetAllUsersResponseSchema,
          404: NotFoundErrorResponseSchema,
        },
      },
    },
    getAllUsersHandler
  );
};
