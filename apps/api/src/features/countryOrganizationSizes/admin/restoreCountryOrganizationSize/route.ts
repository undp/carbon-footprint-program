import { defineRoute } from "@/routing/defineRoute.js";
import {
  RestoreCountryOrganizationSizeParams,
  RestoreCountryOrganizationSizeParamsSchema,
  RestoreCountryOrganizationSizeResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { restoreCountryOrganizationSizeHandler } from "./handler.js";

export const restoreCountryOrganizationSizeRoute = defineRoute<{
  Params: RestoreCountryOrganizationSizeParams;
}>({
  method: "POST",
  path: "/:id/restore",
  schema: {
    tags: ["admin-country-organization-sizes"],
    summary: "Restore a soft-deleted country organization size",
    params: RestoreCountryOrganizationSizeParamsSchema,
    response: {
      200: RestoreCountryOrganizationSizeResponseSchema,
      400: ApiErrorResponseSchema,
      404: ApiErrorResponseSchema,
      409: ApiErrorResponseSchema,
    },
  },
  access: { mode: "private" },
  handler: restoreCountryOrganizationSizeHandler,
});
