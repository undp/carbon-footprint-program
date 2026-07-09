import {
  ConfirmBadgeUploadBody,
  ConfirmBadgeUploadBodySchema,
  ConfirmBadgeUploadParams,
  ConfirmBadgeUploadParamsSchema,
  ConfirmBadgeUploadResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { badgeConfirmUploadHandler } from "./handler.js";
import { defineRoute } from "@/routing/defineRoute.js";

export const badgeConfirmUploadRoute = defineRoute<{
  Params: ConfirmBadgeUploadParams;
  Body: ConfirmBadgeUploadBody;
}>({
  method: "POST",
  path: "/:badgeType/confirm-upload",
  schema: {
    tags: ["files"],
    summary: "Confirm a badge file upload and create the database record",
    params: ConfirmBadgeUploadParamsSchema,
    body: ConfirmBadgeUploadBodySchema,
    response: {
      201: ConfirmBadgeUploadResponseSchema,
      400: ApiErrorResponseSchema,
      401: ApiErrorResponseSchema,
      404: ApiErrorResponseSchema,
      503: ApiErrorResponseSchema,
    },
  },
  access: { mode: "private" },
  handler: badgeConfirmUploadHandler,
});
