import {
  RequestBadgeUploadBody,
  RequestBadgeUploadBodySchema,
  RequestBadgeUploadParams,
  RequestBadgeUploadParamsSchema,
  RequestBadgeUploadResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { badgeRequestUploadHandler } from "./handler.js";
import { defineRoute } from "@/routing/defineRoute.js";

export const badgeRequestUploadRoute = defineRoute<{
  Params: RequestBadgeUploadParams;
  Body: RequestBadgeUploadBody;
}>({
  method: "POST",
  path: "/:badgeType/request-upload",
  schema: {
    tags: ["files"],
    summary: "Request a temporary upload URL for a badge",
    params: RequestBadgeUploadParamsSchema,
    body: RequestBadgeUploadBodySchema,
    response: {
      200: RequestBadgeUploadResponseSchema,
      404: ApiErrorResponseSchema,
      503: ApiErrorResponseSchema,
    },
  },
  access: { mode: "private" },
  handler: badgeRequestUploadHandler,
});
