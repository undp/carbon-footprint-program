import { StandardRouteSignature } from "@/routes/api/index.js";
import {
  GetAllAdminOrganizationMainActivitiesQuerySchema,
  GetAllAdminOrganizationMainActivitiesResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { getAllAdminOrganizationMainActivitiesHandler } from "./handler.js";

export const getAllAdminOrganizationMainActivitiesRoute: StandardRouteSignature =
  (fastify, options) => {
    fastify.get(
      "/",
      {
        schema: {
          tags: ["admin-organization-main-activities"],
          summary: "Get all organization main activities (admin view)",
          querystring: GetAllAdminOrganizationMainActivitiesQuerySchema,
          response: {
            200: GetAllAdminOrganizationMainActivitiesResponseSchema,
            400: ApiErrorResponseSchema,
          },
        },
        config: {
          allowPublicAccess: options?.allowPublicAccess ?? false,
          allowAnonymousAccess: options?.allowAnonymousAccess ?? false,
        },
      },
      getAllAdminOrganizationMainActivitiesHandler
    );
  };
