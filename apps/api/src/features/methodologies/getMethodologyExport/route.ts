import { defineRoute } from "@/routing/defineRoute.js";
import { getMethodologyExportHandler } from "./handler.js";
import {
  GetMethodologyExportParamsSchema,
  GetMethodologyExportResponseSchema,
  type GetMethodologyExportParams,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";

export const getMethodologyExportRoute = defineRoute<{
  Params: GetMethodologyExportParams;
}>({
  method: "GET",
  path: "/:id/export",
  schema: {
    tags: ["methodologies"],
    summary: "Get full methodology export payload",
    description:
      "Returns the methodology with its full hierarchy (categories, subcategories, dimensions, dimension values, emission factors) so the frontend can render a multi-sheet Excel export.",
    params: GetMethodologyExportParamsSchema,
    response: {
      200: GetMethodologyExportResponseSchema,
      404: ApiErrorResponseSchema,
    },
  },
  access: { mode: "private" },
  handler: getMethodologyExportHandler,
});
