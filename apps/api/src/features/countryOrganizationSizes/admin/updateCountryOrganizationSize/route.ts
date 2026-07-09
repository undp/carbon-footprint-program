import { defineRoute } from "@/routing/defineRoute.js";
import {
  UpdateCountryOrganizationSizeParams,
  UpdateCountryOrganizationSizeParamsSchema,
  UpdateCountryOrganizationSizeRequest,
  UpdateCountryOrganizationSizeRequestSchema,
  UpdateCountryOrganizationSizeResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { updateCountryOrganizationSizeHandler } from "./handler.js";

export const updateCountryOrganizationSizeRoute = defineRoute<{
  Params: UpdateCountryOrganizationSizeParams;
  Body: UpdateCountryOrganizationSizeRequest;
}>({
  method: "PATCH",
  path: "/:id",
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
  access: { mode: "private" },
  handler: updateCountryOrganizationSizeHandler,
});
