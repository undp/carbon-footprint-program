import {
  GetOrganizationFormFieldsResponse,
  GetOrganizationFormFieldsResponseSchema,
  SystemRole,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { StandardRouteSignature } from "@/routes/api/index.js";
import { getOrganizationFormFieldsHandler } from "./handler.js";

/**
 * Route definition for GET /forms/organizations
 */
export const getOrganizationFormFieldsRoute: StandardRouteSignature = (
  fastify,
  options
) => {
  fastify.get<{
    Reply: GetOrganizationFormFieldsResponse;
  }>(
    "/organizations",
    {
      schema: {
        tags: ["forms"],
        summary: "Get organization form fields",
        description: "Returns the field definitions for the organization form",
        response: {
          200: GetOrganizationFormFieldsResponseSchema,
          400: ApiErrorResponseSchema,
        },
      },
      config: {
        public: options?.public ?? false,
        allowAnonymousAccess: options?.allowAnonymousAccess ?? false,
      },
      preHandler: [
        fastify.requireRoles([
          SystemRole.SUPERADMIN,
          SystemRole.ADMIN,
          SystemRole.USER,
        ]),
      ],
    },
    getOrganizationFormFieldsHandler
  );
};
