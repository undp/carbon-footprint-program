import {
  GetCarbonInventoryMethodologyExportParamsSchema,
  GetCarbonInventoryMethodologyExportResponseSchema,
  type GetCarbonInventoryMethodologyExportParams,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { defineRoute } from "@/routing/defineRoute.js";
import { getCarbonInventoryMethodologyExportHandler } from "./handler.js";

export const getCarbonInventoryMethodologyExportRoute = defineRoute<{
  Params: GetCarbonInventoryMethodologyExportParams;
}>({
  method: "GET",
  path: "/:id/methodology-export",
  schema: {
    tags: ["carbon-inventories"],
    summary:
      "Get the methodology export payload for the inventory's methodology version",
    description:
      "Returns the full methodology hierarchy of the version applied to the inventory so the web client can render the methodology workbook bundled in the ZIP. Response shape matches the admin `GET /methodologies/:id/export` byte-for-byte.",
    params: GetCarbonInventoryMethodologyExportParamsSchema,
    response: {
      200: GetCarbonInventoryMethodologyExportResponseSchema,
      401: ApiErrorResponseSchema,
      403: ApiErrorResponseSchema,
      404: ApiErrorResponseSchema,
    },
  },
  access: {
    mode: "anonymous",
    options: { canAdminsBypass: true },
  },
  handler: getCarbonInventoryMethodologyExportHandler,
});
