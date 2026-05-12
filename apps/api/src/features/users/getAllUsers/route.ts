import { StandardRouteSignature } from "@/routes/api/index.js";
import { getAllUsersHandler } from "./handler.js";
import {
  GetAllUsersResponse,
  GetAllUsersResponseSchema,
  SystemRole,
} from "@repo/types";

export const getAllUsersRoute: StandardRouteSignature = (fastify, options) => {
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
      config: {
        allowPublicAccess: options?.allowPublicAccess ?? false,
        allowAnonymousAccess: options?.allowAnonymousAccess ?? false,
      },
      preHandler: [
        fastify.requireRoles([SystemRole.ADMIN, SystemRole.SUPERADMIN]),
      ],
    },
    getAllUsersHandler
  );
};
