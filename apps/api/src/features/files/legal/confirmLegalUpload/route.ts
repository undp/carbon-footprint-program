import {
  ConfirmLegalUploadBody,
  ConfirmLegalUploadBodySchema,
  ConfirmLegalUploadResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { confirmLegalUploadHandler } from "./handler.js";
import { defineRoute } from "@/routing/defineRoute.js";

export const confirmLegalUploadRoute = defineRoute<{
  Body: ConfirmLegalUploadBody;
}>({
  method: "POST",
  path: "/confirm-upload",
  schema: {
    tags: ["files"],
    summary:
      "Confirm a legal document upload, persist the File row, and promote it to current Terms & Conditions",
    body: ConfirmLegalUploadBodySchema,
    response: {
      201: ConfirmLegalUploadResponseSchema,
      400: ApiErrorResponseSchema,
      401: ApiErrorResponseSchema,
      404: ApiErrorResponseSchema,
      503: ApiErrorResponseSchema,
    },
  },
  access: { mode: "private" },
  handler: confirmLegalUploadHandler,
});
