import { defineRoute } from "@/routing/defineRoute.js";
import { updateUserRoleHandler } from "./handler.js";
import {
  SystemRole,
  UpdateUserRoleBody,
  UpdateUserRoleBodySchema,
  UpdateUserRoleParams,
  UpdateUserRoleParamsSchema,
  UpdateUserRoleResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";

export const updateUserRoleRoute = defineRoute<{
  Params: UpdateUserRoleParams;
  Body: UpdateUserRoleBody;
}>({
  method: "PATCH",
  path: "/:id/role",
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
  access: {
    mode: "private",
    systemRoles: { kind: "roles", roles: [SystemRole.SUPERADMIN] },
  },
  handler: updateUserRoleHandler,
});
