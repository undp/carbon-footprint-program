import { StandardRouteSignature } from "@/routes/api/index.js";
import {
  UpdateCountryOrganizationSizeParamsSchema,
  UpdateCountryOrganizationSizeRequestSchema,
  UpdateCountryOrganizationSizeResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { updateCountryOrganizationSizeHandler } from "./handler.js";

export const updateCountryOrganizationSizeRoute: StandardRouteSignature = (
  fastify,
  options
) => {
  fastify.patch(
    "/:id",
    {
      schema: {
        tags: ["admin-country-organization-sizes"],
        summary: "Update a country organization size",
        params: UpdateCountryOrganizationSizeParamsSchema,
        body: UpdateCountryOrganizationSizeRequestSchema,
        response: {
          200: UpdateCountryOrganizationSizeResponseSchema,
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
    updateCountryOrganizationSizeHandler
  );
};
