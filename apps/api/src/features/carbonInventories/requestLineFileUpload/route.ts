import {
  RequestLineFileUploadBodySchema,
  RequestLineFileUploadParamsSchema,
  RequestLineFileUploadResponseSchema,
  type RequestLineFileUploadBody,
  type RequestLineFileUploadParams,
} from "@repo/types";
import { OrganizationRole } from "@repo/database/enums";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { defineRoute } from "@/routing/defineRoute.js";
import { requestLineFileUploadHandler } from "./handler.js";

export const requestLineFileUploadRoute = defineRoute<{
  Params: RequestLineFileUploadParams;
  Body: RequestLineFileUploadBody;
}>({
  method: "POST",
  path: "/:id/files/request-upload",
  schema: {
    tags: ["carbon-inventories"],
    summary: "Request a temporary upload URL for a carbon inventory line file",
    params: RequestLineFileUploadParamsSchema,
    body: RequestLineFileUploadBodySchema,
    response: {
      200: RequestLineFileUploadResponseSchema,
      400: ApiErrorResponseSchema,
      403: ApiErrorResponseSchema,
      404: ApiErrorResponseSchema,
      503: ApiErrorResponseSchema,
    },
  },
  access: {
    mode: "anonymous",
    options: {
      requiredOrganizationRoles: [
        OrganizationRole.CONTRIBUTOR,
        OrganizationRole.ADMIN,
      ],
    },
  },
  handler: requestLineFileUploadHandler,
});
