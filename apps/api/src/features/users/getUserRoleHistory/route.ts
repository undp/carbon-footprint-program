import type { FastifyZodInstance } from "@/types/fastify.js";
import { getUserRoleHistoryHandler } from "./handler.js";
import {
  GetUserRoleHistoryParamsSchema,
  GetUserRoleHistoryResponseSchema,
  GetUserRoleHistoryParams,
  GetUserRoleHistoryResponse,
  SystemRole,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";

export const getUserRoleHistoryRoute = (fastify: FastifyZodInstance) => {
  fastify.get<{
    Params: GetUserRoleHistoryParams;
    Reply: GetUserRoleHistoryResponse;
  }>(
    "/:id/role-history",
    {
      schema: {
        tags: ["users"],
        summary: "Get role change history for a user",
        description:
          "Returns role transition audit rows for the given user, ordered by date descending",
        params: GetUserRoleHistoryParamsSchema,
        response: {
          200: GetUserRoleHistoryResponseSchema,
          403: ApiErrorResponseSchema,
          404: ApiErrorResponseSchema,
        },
      },
      preHandler: [
        fastify.requireRoles([SystemRole.ADMIN, SystemRole.SUPERADMIN]),
      ],
    },
    getUserRoleHistoryHandler
  );
};
