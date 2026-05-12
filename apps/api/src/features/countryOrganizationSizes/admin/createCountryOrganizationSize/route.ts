import { StandardRouteSignature } from "@/routes/api/index.js";
import {
  CreateCountryOrganizationSizeRequestSchema,
  CreateCountryOrganizationSizeResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { createCountryOrganizationSizeHandler } from "./handler.js";

export const createCountryOrganizationSizeRoute: StandardRouteSignature = (
  fastify,
  options
) => {
  fastify.post(
    "/",
    {
      schema: {
        tags: ["admin-country-organization-sizes"],
        summary: "Create a country organization size",
        body: CreateCountryOrganizationSizeRequestSchema,
        response: {
          201: CreateCountryOrganizationSizeResponseSchema,
          400: ApiErrorResponseSchema,
          409: ApiErrorResponseSchema,
        },
      },
      config: {
        public: options?.public ?? false,
        allowAnonymousAccess: options?.allowAnonymousAccess ?? false,
      },
    },
    createCountryOrganizationSizeHandler
  );
};
