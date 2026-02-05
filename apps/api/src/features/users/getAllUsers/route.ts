import type { FastifyZodInstance } from "@/types/fastify.js";
import { getAllUsersHandler } from "./handler.js";
import { GetAllUsersResponseSchema } from "@repo/types";

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
        },
      },
    },
    getAllUsersHandler
  );
};
