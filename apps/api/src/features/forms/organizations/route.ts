import { GetOrganizationFormFieldsResponseSchema } from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { defineRoute } from "@/routing/defineRoute.js";
import { getOrganizationFormFieldsHandler } from "./handler.js";

/**
 * Route definition for GET /forms/organizations
 */
export const getOrganizationFormFieldsRoute = defineRoute({
  method: "GET",
  path: "/organizations",
  schema: {
    tags: ["forms"],
    summary: "Get organization form fields",
    description: "Returns the field definitions for the organization form",
    response: {
      200: GetOrganizationFormFieldsResponseSchema,
      400: ApiErrorResponseSchema,
    },
  },
  access: { mode: "private" },
  handler: getOrganizationFormFieldsHandler,
});
