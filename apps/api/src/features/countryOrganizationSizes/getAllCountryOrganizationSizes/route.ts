import { defineRoute } from "@/routing/defineRoute.js";
import { getAllCountryOrganizationSizesHandler } from "./handler.js";
import { GetAllCountryOrganizationSizesResponseSchema } from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";

export const getAllCountryOrganizationSizesRoute = defineRoute({
  method: "GET",
  path: "/",
  schema: {
    tags: ["country-organization-sizes"],
    summary: "Get all country organization sizes",
    description: "Retrieves all country organization sizes with their details",
    response: {
      200: GetAllCountryOrganizationSizesResponseSchema,
      404: ApiErrorResponseSchema,
    },
  },
  access: { mode: "public" },
  handler: getAllCountryOrganizationSizesHandler,
});
