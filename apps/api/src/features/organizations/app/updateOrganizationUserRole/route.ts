import type { FastifyRequest } from "fastify";
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

// Extractor function for organization ID
const extractOrganizationId = async (request: FastifyRequest) =>
  Promise.resolve(
    (request.params as UpdateOrganizationUserRoleParams).organizationId
  );

export const updateOrganizationUserRoleRoute: StandardRouteSignature = (
  fastify,
  _options
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
      preHandler: [
        fastify.requireOrganizationRole(extractOrganizationId, [
          OrganizationRole.ADMIN,
        ]),
      ],
    },
    updateOrganizationUserRoleHandler
  );
};
