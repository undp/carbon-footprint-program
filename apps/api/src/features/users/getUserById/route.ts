import { StandardRouteSignature } from "@/routes/api/index.js";
import { getUserByIdHandler } from "./handler.js";
import {
  GetUserByIdParams,
  GetUserByIdParamsSchema,
  GetUserByIdResponse,
  GetUserByIdResponseSchema,
  SystemRole,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";

export const getUserByIdRoute: StandardRouteSignature = (fastify, options) => {
  fastify.get<{
    Params: GetUserByIdParams;
    Reply: GetUserByIdResponse;
  }>(
    "/:id",
    {
      schema: {
        tags: ["users"],
        summary: "Get user by ID",
        description: "Get a specific user by their ID",
        params: GetUserByIdParamsSchema,
        response: {
          200: GetUserByIdResponseSchema,
          404: ApiErrorResponseSchema,
        },
      },
      config: {
        public: options?.public ?? false,
        allowAnonymousAccess: options?.allowAnonymousAccess ?? false,
      },
      preHandler: [
        fastify.requireRoles([SystemRole.ADMIN, SystemRole.SUPERADMIN]),
      ],
    },
    getUserByIdHandler
  );
};
