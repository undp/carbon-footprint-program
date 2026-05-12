import { OrganizationRole } from "@repo/database/enums";
import { getOrganizationUsersHandler } from "./handler.js";
import {
  GetOrganizationUsersParamsSchema,
  GetOrganizationUsersResponseSchema,
  GetOrganizationUsersParams,
  GetOrganizationUsersResponse,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { StandardRouteSignature } from "@/routes/api/index.js";
import { organizationIdRequestExtractor } from "../../helpers.js";

export const getOrganizationUsersRoute: StandardRouteSignature = (
  fastify,
  options
) => {
  fastify.get<{
    Params: GetOrganizationUsersParams;
    Reply: GetOrganizationUsersResponse;
  }>(
    "/:organizationId/users",
    {
      schema: {
        tags: ["organizations"],
        summary: "Get organization users",
        description:
          "Get all active users in an organization with their roles. Results are sorted by role priority and name.",
        params: GetOrganizationUsersParamsSchema,
        response: {
          200: GetOrganizationUsersResponseSchema,
          400: ApiErrorResponseSchema,
          403: ApiErrorResponseSchema,
          404: ApiErrorResponseSchema,
        },
      },
      config: {
        allowPublicAccess: options?.allowPublicAccess ?? false,
        allowAnonymousAccess: options?.allowAnonymousAccess ?? false,
      },
      preHandler: [
        fastify.requireOrganizationRole(organizationIdRequestExtractor, {
          allowedRoles: [
            OrganizationRole.ADMIN,
            OrganizationRole.CONTRIBUTOR,
            OrganizationRole.VIEWER,
          ],
        }),
      ],
    },
    getOrganizationUsersHandler
  );
};
