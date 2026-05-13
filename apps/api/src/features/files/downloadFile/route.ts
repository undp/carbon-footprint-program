import {
  DownloadFileParams,
  DownloadFileParamsSchema,
  DownloadFileResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { defineRoute } from "@/routing/defineRoute.js";
import { downloadFileHandler } from "./handler.js";

export const downloadFileRoute = defineRoute<{
  Params: DownloadFileParams;
}>({
  method: "GET",
  path: "/:uuid/download",
  schema: {
    tags: ["files"],
    summary: "Get a temporary download URL for a file",
    params: DownloadFileParamsSchema,
    response: {
      200: DownloadFileResponseSchema,
      404: ApiErrorResponseSchema,
      503: ApiErrorResponseSchema,
    },
  },
  access: { mode: "private" },
  handler: downloadFileHandler,
});
