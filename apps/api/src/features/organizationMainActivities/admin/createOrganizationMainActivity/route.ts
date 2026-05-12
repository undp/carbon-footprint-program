import { StandardRouteSignature } from "@/routes/api/index.js";
import {
  CreateOrganizationMainActivityRequestSchema,
  CreateOrganizationMainActivityResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { createOrganizationMainActivityHandler } from "./handler.js";

export const createOrganizationMainActivityRoute: StandardRouteSignature = (
  fastify,
  options
) => {
  fastify.post(
    "/",
    {
      schema: {
        tags: ["admin-organization-main-activities"],
        summary: "Create an organization main activity",
        body: CreateOrganizationMainActivityRequestSchema,
        response: {
          201: CreateOrganizationMainActivityResponseSchema,
          400: ApiErrorResponseSchema,
          404: ApiErrorResponseSchema,
          409: ApiErrorResponseSchema,
        },
      },
      config: {
        allowPublicAccess: options?.allowPublicAccess ?? false,
        allowAnonymousAccess: options?.allowAnonymousAccess ?? false,
      },
    },
    createOrganizationMainActivityHandler
  );
};
