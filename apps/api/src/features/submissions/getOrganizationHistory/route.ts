import { getOrganizationHistoryHandler } from "./handler.js";
import {
  GetOrganizationHistoryParamsSchema,
  GetOrganizationHistoryResponseSchema,
  OrganizationRole,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import type { StandardRouteSignature } from "@/routes/api/index.js";
import { idRequestExtractor } from "@/helpers/idRequestExtractor.js";

export const getOrganizationHistoryRoute: StandardRouteSignature = (
  fastify
) => {
  fastify.get(
    "/organization/:id/history",
    {
      schema: {
        tags: ["submissions"],
        summary: "Get organization submission history",
        description:
          "Get the history of submissions for a specific organization.",
        params: GetOrganizationHistoryParamsSchema,
        response: {
          200: GetOrganizationHistoryResponseSchema,
          503: ApiErrorResponseSchema,
        },
      },
      preHandler: [
        fastify.requireOrganizationRole(idRequestExtractor, {
          allowedRoles: [
            OrganizationRole.ADMIN,
            OrganizationRole.CONTRIBUTOR,
            OrganizationRole.VIEWER,
          ],
          canAdminsBypass: true,
        }),
      ],
    },
    getOrganizationHistoryHandler
  );
};
