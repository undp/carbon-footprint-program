import { defineRoute } from "@/routing/defineRoute.js";
import { getUserRoleHistoryHandler } from "./handler.js";
import {
  GetUserRoleHistoryParams,
  GetUserRoleHistoryParamsSchema,
  GetUserRoleHistoryResponse,
  GetUserRoleHistoryResponseSchema,
  SystemRole,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";

export const getUserRoleHistoryRoute = defineRoute<{
  Params: GetUserRoleHistoryParams;
  Reply: GetUserRoleHistoryResponse;
}>({
  method: "GET",
  path: "/:id/role-history",
  schema: {
    tags: ["users"],
    summary: "Get role change history for a user",
    description:
      "Returns role transition audit rows for the given user, ordered by date descending",
    params: GetUserRoleHistoryParamsSchema,
    response: {
      200: GetUserRoleHistoryResponseSchema,
      403: ApiErrorResponseSchema,
    },
  },
  access: {
    mode: "private",
    systemRoles: {
      kind: "roles",
      roles: [SystemRole.ADMIN, SystemRole.SUPERADMIN],
    },
  },
  handler: getUserRoleHistoryHandler,
});
