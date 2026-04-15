import { getReductionProjectHistoryHandler } from "./handler.js";
import {
  GetReductionProjectHistoryParams,
  GetReductionProjectHistoryParamsSchema,
  GetReductionProjectHistoryResponseSchema,
  OrganizationRole,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import type { StandardRouteSignature } from "@/routes/api/index.js";

export const getReductionProjectHistoryRoute: StandardRouteSignature = (
  fastify
) => {
  fastify.get<{ Params: GetReductionProjectHistoryParams }>(
    "/reduction-project/:id/history",
    {
      schema: {
        tags: ["submissions"],
        summary: "Get reduction project submission history",
        description:
          "Get the history of submissions for a specific reduction project.",
        params: GetReductionProjectHistoryParamsSchema,
        response: {
          200: GetReductionProjectHistoryResponseSchema,
          403: ApiErrorResponseSchema,
          404: ApiErrorResponseSchema,
        },
      },
      preHandler: [
        fastify.requireReductionProjectAccess({
          requiredOrganizationRoles: [
            OrganizationRole.ADMIN,
            OrganizationRole.CONTRIBUTOR,
            OrganizationRole.VIEWER,
          ],
          canAdminsBypass: true,
        }),
      ],
    },
    getReductionProjectHistoryHandler
  );
};
