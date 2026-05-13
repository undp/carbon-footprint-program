import { defineRoute } from "@/routing/defineRoute.js";
import {
  CreateCountryOrganizationSizeRequest,
  CreateCountryOrganizationSizeRequestSchema,
  CreateCountryOrganizationSizeResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { createCountryOrganizationSizeHandler } from "./handler.js";

export const createCountryOrganizationSizeRoute = defineRoute<{
  Body: CreateCountryOrganizationSizeRequest;
}>({
  method: "POST",
  path: "/",
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
  access: { mode: "private" },
  handler: createCountryOrganizationSizeHandler,
});
