import { StandardRouteSignature } from "@/routes/api/index.js";
import {
  GetAllAdminCountryOrganizationSizesQuerySchema,
  GetAllAdminCountryOrganizationSizesResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { getAllAdminCountryOrganizationSizesHandler } from "./handler.js";

export const getAllAdminCountryOrganizationSizesRoute: StandardRouteSignature =
  (fastify, options) => {
    fastify.get(
      "/",
      {
        schema: {
          tags: ["admin-country-organization-sizes"],
          summary: "Get all country organization sizes (admin view)",
          querystring: GetAllAdminCountryOrganizationSizesQuerySchema,
          response: {
            200: GetAllAdminCountryOrganizationSizesResponseSchema,
            400: ApiErrorResponseSchema,
          },
        },
        config: {
          public: options?.public ?? false,
          allowAnonymousAccess: options?.allowAnonymousAccess ?? false,
        },
      },
      getAllAdminCountryOrganizationSizesHandler
    );
  };
