import {
  ConfirmUploadBody,
  ConfirmUploadBodySchema,
  ConfirmUploadResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { confirmUploadHandler } from "./handler.js";
import { defineRoute } from "@/routing/defineRoute.js";

export const confirmUploadRoute = defineRoute<{
  Body: ConfirmUploadBody;
}>({
  method: "POST",
  path: "/confirm-upload",
  schema: {
    tags: ["files"],
    summary: "Confirm a file upload and create the database record",
    body: ConfirmUploadBodySchema,
    response: {
      201: ConfirmUploadResponseSchema,
      401: ApiErrorResponseSchema,
      404: ApiErrorResponseSchema,
      503: ApiErrorResponseSchema,
    },
  },
  access: { mode: "private" },
  handler: confirmUploadHandler,
});
