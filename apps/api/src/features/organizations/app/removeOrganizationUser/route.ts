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
import { organizationIdRequestExtractor } from "../../helpers.js";

export const removeOrganizationUserRoute: StandardRouteSignature = (
  fastify,
  options
) => {
  fastify.delete<{
    Params: RemoveOrganizationUserParams;
    Reply: RemoveOrganizationUserResponse;
  }>(
    "/:organizationId/users/:organizationUserId",
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
      config: {
        public: options?.public ?? false,
        allowAnonymousAccess: options?.allowAnonymousAccess ?? false,
      },
      preHandler: [
        fastify.requireOrganizationRole(organizationIdRequestExtractor, {
          allowedRoles: [OrganizationRole.ADMIN],
        }),
      ],
    },
    removeOrganizationUserHandler
  );
};
