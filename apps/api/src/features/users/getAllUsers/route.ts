import { defineRoute } from "@/routing/defineRoute.js";
import { getAllUsersHandler } from "./handler.js";
import { GetAllUsersResponseSchema, SystemRole } from "@repo/types";

export const getAllUsersRoute = defineRoute({
  method: "GET",
  path: "/",
  schema: {
    tags: ["users"],
    summary: "Get all users",
    description: "Get all users ordered by creation date (newest first)",
    response: {
      200: GetAllUsersResponseSchema,
    },
  },
  access: {
    mode: "private",
    systemRoles: {
      kind: "roles",
      roles: [SystemRole.ADMIN, SystemRole.SUPERADMIN],
    },
  },
  handler: getAllUsersHandler,
});
