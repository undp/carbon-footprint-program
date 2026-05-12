import { StandardRouteSignature } from "@/routes/api/index.js";
import { createUserHandler } from "./handler.js";
import {
  CreateUserBody,
  CreateUserBodySchema,
  CreateUserResponse,
  CreateUserResponseSchema,
  SystemRole,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";

export const createUserRoute: StandardRouteSignature = (fastify, options) => {
  fastify.post<{
    Body: CreateUserBody;
    Reply: CreateUserResponse;
  }>(
    "/",
    {
      schema: {
        tags: ["users"],
        summary: "Create a new user",
        description: "Create a new user in the system",
        body: CreateUserBodySchema,
        response: {
          201: CreateUserResponseSchema,
          400: ApiErrorResponseSchema,
          409: ApiErrorResponseSchema,
          422: ApiErrorResponseSchema,
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
    createUserHandler
  );
};
