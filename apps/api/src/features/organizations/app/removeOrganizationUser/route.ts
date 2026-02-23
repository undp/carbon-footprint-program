import type { FastifyRequest } from "fastify";
import { OrganizationRole } from "@repo/database/enums";
import { removeOrganizationUserHandler } from "./handler.js";
import {
  RemoveOrganizationUserParams,
  RemoveOrganizationUserParamsSchema,
  RemoveOrganizationUserResponse,
  RemoveOrganizationUserResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { StandardRouteSignature } from "@/routes/api/index.js";

// Extractor function for organization ID
const extractOrganizationId = async (request: FastifyRequest) =>
  Promise.resolve(
    (request.params as RemoveOrganizationUserParams).organizationId
  );

export const removeOrganizationUserRoute: StandardRouteSignature = (
  fastify,
  _options
) => {
  fastify.delete<{
    Params: RemoveOrganizationUserParams;
    Reply: RemoveOrganizationUserResponse;
  }>(
    "/:organizationId/users/:userId",
    {
      schema: {
        tags: ["organizations"],
        summary: "Remove user from organization",
        description:
          "Remove a user from an organization (soft delete). Users cannot remove themselves. Cannot remove the last admin.",
        params: RemoveOrganizationUserParamsSchema,
        response: {
          200: RemoveOrganizationUserResponseSchema,
          400: ApiErrorResponseSchema,
          403: ApiErrorResponseSchema,
          404: ApiErrorResponseSchema,
          409: ApiErrorResponseSchema,
        },
      },
      preHandler: [
        fastify.requireOrganizationRole(extractOrganizationId, [
          OrganizationRole.ORGANIZATION_ADMIN,
        ]),
      ],
    },
    removeOrganizationUserHandler
  );
};
