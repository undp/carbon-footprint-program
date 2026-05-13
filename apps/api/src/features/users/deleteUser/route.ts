import { defineRoute } from "@/routing/defineRoute.js";
import { deleteUserHandler } from "./handler.js";
import {
  DeleteUserParams,
  DeleteUserParamsSchema,
  DeleteUserResponseSchema,
  SystemRole,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";

export const deleteUserRoute = defineRoute<{
  Params: DeleteUserParams;
}>({
  method: "DELETE",
  path: "/:id",
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
  access: {
    mode: "private",
    systemRoles: {
      kind: "roles",
      roles: [SystemRole.ADMIN, SystemRole.SUPERADMIN],
    },
  },
  handler: deleteUserHandler,
});
