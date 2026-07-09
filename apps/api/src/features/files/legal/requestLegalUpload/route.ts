import {
  RequestLegalUploadBody,
  RequestLegalUploadBodySchema,
  RequestLegalUploadResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { requestLegalUploadHandler } from "./handler.js";
import { defineRoute } from "@/routing/defineRoute.js";

export const requestLegalUploadRoute = defineRoute<{
  Body: RequestLegalUploadBody;
}>({
  method: "POST",
  path: "/request-upload",
  schema: {
    tags: ["files"],
    summary:
      "Request a temporary upload URL for a legal document (Terms & Conditions)",
    body: RequestLegalUploadBodySchema,
    response: {
      200: RequestLegalUploadResponseSchema,
      503: ApiErrorResponseSchema,
    },
  },
  access: { mode: "private" },
  handler: requestLegalUploadHandler,
});
