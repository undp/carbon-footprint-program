import {
  PreviewLineFileParamsSchema,
  PreviewLineFileResponseSchema,
  type PreviewLineFileParams,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { defineRoute } from "@/routing/defineRoute.js";
import { previewLineFileHandler } from "./handler.js";

export const previewLineFileRoute = defineRoute<{
  Params: PreviewLineFileParams;
}>({
  method: "GET",
  path: "/:id/files/:uuid/preview",
  schema: {
    tags: ["carbon-inventories"],
    summary: "Get a temporary preview URL for a carbon inventory line file",
    params: PreviewLineFileParamsSchema,
    response: {
      200: PreviewLineFileResponseSchema,
      401: ApiErrorResponseSchema,
      403: ApiErrorResponseSchema,
      404: ApiErrorResponseSchema,
      422: ApiErrorResponseSchema,
      503: ApiErrorResponseSchema,
    },
  },
  access: {
    mode: "anonymous",
  },
  handler: previewLineFileHandler,
});
