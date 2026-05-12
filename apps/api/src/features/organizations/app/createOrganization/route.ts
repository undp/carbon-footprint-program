import { createOrganizationHandler } from "./handler.js";
import {
  CreateOrganizationBodySchema,
  CreateOrganizationResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { StandardRouteSignature } from "@/routes/api/index.js";

export const createOrganizationRoute: StandardRouteSignature = (
  fastify,
  options
) => {
  fastify.post(
    "/",
    {
      schema: {
        tags: ["organizations"],
        summary: "Create organization",
        description:
          "Create a new organization with auto-membership as ACCREDITED_MEMBER",
        body: CreateOrganizationBodySchema,
        response: {
          201: CreateOrganizationResponseSchema,
          400: ApiErrorResponseSchema,
          500: ApiErrorResponseSchema,
        },
      },
      config: {
        public: options?.public ?? false,
        allowAnonymousAccess: options?.allowAnonymousAccess ?? false,
      },
    },
    createOrganizationHandler
  );
};
