import { GetOrganizationFormFieldsResponseSchema } from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { StandardRouteSignature } from "@/routes/api/index.js";
import { getOrganizationFormFieldsHandler } from "./handler.js";

/**
 * Route definition for GET /forms/organizations
 */
export const getOrganizationFormFieldsRoute: StandardRouteSignature = (
  fastify,
  _options
) => {
  fastify.get(
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
    },
    getOrganizationFormFieldsHandler
  );
};
