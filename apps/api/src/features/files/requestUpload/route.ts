import {
  RequestUploadBody,
  RequestUploadBodySchema,
  RequestUploadResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { requestUploadHandler } from "./handler.js";
import { defineRoute } from "@/routing/defineRoute.js";

export const requestUploadRoute = defineRoute<{
  Body: RequestUploadBody;
}>({
  method: "POST",
  path: "/request-upload",
  schema: {
    tags: ["files"],
    summary: "Request a temporary upload URL for a file",
    body: RequestUploadBodySchema,
    response: {
      200: RequestUploadResponseSchema,
      400: ApiErrorResponseSchema,
      503: ApiErrorResponseSchema,
    },
  },
  access: { mode: "private" },
  handler: requestUploadHandler,
});
