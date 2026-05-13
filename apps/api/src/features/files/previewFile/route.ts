import {
  PreviewFileParams,
  PreviewFileParamsSchema,
  PreviewFileResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { defineRoute } from "@/routing/defineRoute.js";
import { previewFileHandler } from "./handler.js";

export const previewFileRoute = defineRoute<{
  Params: PreviewFileParams;
}>({
  method: "GET",
  path: "/:uuid/preview",
  schema: {
    tags: ["files"],
    summary: "Get a temporary preview URL for a file",
    params: PreviewFileParamsSchema,
    response: {
      200: PreviewFileResponseSchema,
      401: ApiErrorResponseSchema,
      404: ApiErrorResponseSchema,
      503: ApiErrorResponseSchema,
    },
  },
  access: { mode: "private" },
  handler: previewFileHandler,
});
