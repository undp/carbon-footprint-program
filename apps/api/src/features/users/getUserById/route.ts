import { defineRoute } from "@/routing/defineRoute.js";
import { getUserByIdHandler } from "./handler.js";
import {
  GetUserByIdParams,
  GetUserByIdParamsSchema,
  GetUserByIdResponseSchema,
  SystemRole,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";

export const getUserByIdRoute = defineRoute<{
  Params: GetUserByIdParams;
}>({
  method: "GET",
  path: "/:id",
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
  access: {
    mode: "private",
    systemRoles: {
      kind: "roles",
      roles: [SystemRole.ADMIN, SystemRole.SUPERADMIN],
    },
  },
  handler: getUserByIdHandler,
});
