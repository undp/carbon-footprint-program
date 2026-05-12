import { StandardRouteSignature } from "@/routes/api/index.js";
import { updateUserRoleHandler } from "./handler.js";
import {
  SystemRole,
  UpdateUserRoleBody,
  UpdateUserRoleBodySchema,
  UpdateUserRoleParams,
  UpdateUserRoleParamsSchema,
  UpdateUserRoleResponse,
  UpdateUserRoleResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";

export const updateUserRoleRoute: StandardRouteSignature = (
  fastify,
  options
) => {
  fastify.patch<{
    Params: UpdateUserRoleParams;
    Body: UpdateUserRoleBody;
    Reply: UpdateUserRoleResponse;
  }>(
    "/:id/role",
    {
      schema: {
        tags: ["users"],
        summary: "Update a user's system role",
        description:
          "Change the system role of a user. Only superadmins can perform this action.",
        params: UpdateUserRoleParamsSchema,
        body: UpdateUserRoleBodySchema,
        response: {
          200: UpdateUserRoleResponseSchema,
          400: ApiErrorResponseSchema,
          403: ApiErrorResponseSchema,
          404: ApiErrorResponseSchema,
          409: ApiErrorResponseSchema,
          422: ApiErrorResponseSchema,
        },
      },
      config: {
        allowPublicAccess: options?.allowPublicAccess ?? false,
        allowAnonymousAccess: options?.allowAnonymousAccess ?? false,
      },
      preHandler: [fastify.requireRoles([SystemRole.SUPERADMIN])],
    },
    updateUserRoleHandler
  );
};
