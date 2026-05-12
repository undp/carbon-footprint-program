import { OrganizationRole } from "@repo/database/enums";
import { updateOrganizationUserRoleHandler } from "./handler.js";
import {
  UpdateOrganizationUserRoleParamsSchema,
  UpdateOrganizationUserRoleBodySchema,
  UpdateOrganizationUserRoleResponseSchema,
  UpdateOrganizationUserRoleParams,
  UpdateOrganizationUserRoleBody,
  UpdateOrganizationUserRoleResponse,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { StandardRouteSignature } from "@/routes/api/index.js";
import { organizationIdRequestExtractor } from "../../helpers.js";

export const updateOrganizationUserRoleRoute: StandardRouteSignature = (
  fastify,
  options
) => {
  fastify.patch<{
    Params: UpdateOrganizationUserRoleParams;
    Body: UpdateOrganizationUserRoleBody;
    Reply: UpdateOrganizationUserRoleResponse;
  }>(
    "/:organizationId/users/:organizationUserId",
    {
      schema: {
        tags: ["organizations"],
        summary: "Update user role in organization",
        description:
          "Update the role of a user within an organization. Users cannot update their own role.",
        params: UpdateOrganizationUserRoleParamsSchema,
        body: UpdateOrganizationUserRoleBodySchema,
        response: {
          200: UpdateOrganizationUserRoleResponseSchema,
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
          allowedRoles: [OrganizationRole.ADMIN],
        }),
      ],
    },
    updateOrganizationUserRoleHandler
  );
};
