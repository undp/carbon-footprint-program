import { StandardRouteSignature } from "@/routes/api/index.js";
import {
  DeleteCountryOrganizationSizeParamsSchema,
  DeleteCountryOrganizationSizeResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { deleteCountryOrganizationSizeHandler } from "./handler.js";

export const deleteCountryOrganizationSizeRoute: StandardRouteSignature = (
  fastify,
  options
) => {
  fastify.delete(
    "/:id",
    {
      schema: {
        tags: ["admin-country-organization-sizes"],
        summary: "Soft-delete a country organization size",
        params: DeleteCountryOrganizationSizeParamsSchema,
        response: {
          200: DeleteCountryOrganizationSizeResponseSchema,
          404: ApiErrorResponseSchema,
        },
      },
      config: {
        allowPublicAccess: options?.allowPublicAccess ?? false,
        allowAnonymousAccess: options?.allowAnonymousAccess ?? false,
      },
    },
    deleteCountryOrganizationSizeHandler
  );
};
