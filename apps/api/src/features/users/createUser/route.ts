import { defineRoute } from "@/routing/defineRoute.js";
import { createUserHandler } from "./handler.js";
import {
  CreateUserBody,
  CreateUserBodySchema,
  CreateUserResponseSchema,
  SystemRole,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";

export const createUserRoute = defineRoute<{
  Body: CreateUserBody;
}>({
  method: "POST",
  path: "/",
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
  access: {
    mode: "private",
    systemRoles: {
      kind: "roles",
      roles: [SystemRole.ADMIN, SystemRole.SUPERADMIN],
    },
  },
  handler: createUserHandler,
});
