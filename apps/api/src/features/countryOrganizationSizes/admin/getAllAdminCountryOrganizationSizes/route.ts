import { defineRoute } from "@/routing/defineRoute.js";
import {
  GetAllAdminCountryOrganizationSizesQuery,
  GetAllAdminCountryOrganizationSizesQuerySchema,
  GetAllAdminCountryOrganizationSizesResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { getAllAdminCountryOrganizationSizesHandler } from "./handler.js";

export const getAllAdminCountryOrganizationSizesRoute = defineRoute<{
  Querystring: GetAllAdminCountryOrganizationSizesQuery;
}>({
  method: "GET",
  path: "/",
  schema: {
    tags: ["admin-country-organization-sizes"],
    summary: "Get all country organization sizes (admin view)",
    querystring: GetAllAdminCountryOrganizationSizesQuerySchema,
    response: {
      200: GetAllAdminCountryOrganizationSizesResponseSchema,
      400: ApiErrorResponseSchema,
    },
  },
  access: { mode: "private" },
  handler: getAllAdminCountryOrganizationSizesHandler,
});
