import { StandardRouteSignature } from "@/routes/api/index.js";
import { getAllCountryOrganizationSizesHandler } from "./handler.js";
import { GetAllCountryOrganizationSizesResponseSchema } from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";

export const getAllCountryOrganizationSizesRoute: StandardRouteSignature = (
  fastify,
  options
) => {
  fastify.get(
    "/",
    {
      schema: {
        tags: ["country-organization-sizes"],
        summary: "Get all country organization sizes",
        description:
          "Retrieves all country organization sizes with their details",
        response: {
          200: GetAllCountryOrganizationSizesResponseSchema,
          404: ApiErrorResponseSchema,
        },
      },
      config: {
        allowPublicAccess: options?.allowPublicAccess ?? false,
        allowAnonymousAccess: options?.allowAnonymousAccess ?? false,
      },
    },
    getAllCountryOrganizationSizesHandler
  );
};
