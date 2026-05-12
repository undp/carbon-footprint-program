import { getOrganizationHistoryHandler } from "./handler.js";
import {
  GetOrganizationHistoryParams,
  GetOrganizationHistoryParamsSchema,
  GetOrganizationHistoryResponseSchema,
  OrganizationRole,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import type { StandardRouteSignature } from "@/routes/api/index.js";
import { idRequestExtractor } from "@/helpers/idRequestExtractor.js";

export const getOrganizationHistoryRoute: StandardRouteSignature = (
  fastify,
  options
) => {
  fastify.get<{ Params: GetOrganizationHistoryParams }>(
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
      config: {
        allowPublicAccess: options?.allowPublicAccess ?? false,
        allowAnonymousAccess: options?.allowAnonymousAccess ?? false,
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
