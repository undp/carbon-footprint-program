import { OrganizationRole } from "@repo/database/enums";
import { addOrganizationUserHandler } from "./handler.js";
import {
  AddOrganizationUserParamsSchema,
  AddOrganizationUserBodySchema,
  AddOrganizationUserResponseSchema,
  AddOrganizationUserParams,
  AddOrganizationUserResponse,
  AddOrganizationUserBody,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { StandardRouteSignature } from "@/routes/api/index.js";
import { organizationIdRequestExtractor } from "../../helpers.js";

export const addOrganizationUserRoute: StandardRouteSignature = (
  fastify,
  options
) => {
  fastify.post<{
    Params: AddOrganizationUserParams;
    Body: AddOrganizationUserBody;
    Reply: AddOrganizationUserResponse;
  }>(
    "/:organizationId/users",
    {
      schema: {
        tags: ["organizations"],
        summary: "Add user to organization",
        description:
          "Add an existing user to an organization with a specific role. User must exist in the system.",
        params: AddOrganizationUserParamsSchema,
        body: AddOrganizationUserBodySchema,
        response: {
          201: AddOrganizationUserResponseSchema,
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
    addOrganizationUserHandler
  );
};
