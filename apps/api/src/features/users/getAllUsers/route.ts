import type { FastifyZodInstance } from "@/types/fastify.js";
import { getAllUsersHandler } from "./handler.js";
import {
  GetAllUsersResponse,
  GetAllUsersResponseSchema,
  SystemRole,
} from "@repo/types";

export const getAllUsersRoute = (fastify: FastifyZodInstance) => {
  fastify.get<{
    Reply: GetAllUsersResponse;
  }>(
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
      preHandler: [
        fastify.requireRoles([SystemRole.ADMIN, SystemRole.SUPERADMIN]),
      ],
    },
    getAllUsersHandler
  );
};
