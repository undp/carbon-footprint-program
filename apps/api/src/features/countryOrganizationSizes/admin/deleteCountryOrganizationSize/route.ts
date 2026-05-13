import { defineRoute } from "@/routing/defineRoute.js";
import {
  DeleteCountryOrganizationSizeParams,
  DeleteCountryOrganizationSizeParamsSchema,
  DeleteCountryOrganizationSizeResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { deleteCountryOrganizationSizeHandler } from "./handler.js";

export const deleteCountryOrganizationSizeRoute = defineRoute<{
  Params: DeleteCountryOrganizationSizeParams;
}>({
  method: "DELETE",
  path: "/:id",
  schema: {
    tags: ["admin-country-organization-sizes"],
    summary: "Soft-delete a country organization size",
    params: DeleteCountryOrganizationSizeParamsSchema,
    response: {
      200: DeleteCountryOrganizationSizeResponseSchema,
      404: ApiErrorResponseSchema,
    },
  },
  access: { mode: "private" },
  handler: deleteCountryOrganizationSizeHandler,
});
