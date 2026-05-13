import { defineRoute } from "@/routing/defineRoute.js";
import { getMeHandler } from "./handler.js";
import { GetMeResponseSchema, SystemRole } from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";

export const getMeRoute = defineRoute({
  method: "GET",
  path: "/me",
  schema: {
    tags: ["users"],
    summary: "Get the current authenticated user",
    description: "Retrieve the details of the currently authenticated user",
    response: {
      200: GetMeResponseSchema,
      400: ApiErrorResponseSchema,
      500: ApiErrorResponseSchema,
    },
  },
  access: {
    mode: "private",
    systemRoles: {
      kind: "roles",
      roles: [SystemRole.USER, SystemRole.ADMIN, SystemRole.SUPERADMIN],
    },
  },
  handler: getMeHandler,
});
