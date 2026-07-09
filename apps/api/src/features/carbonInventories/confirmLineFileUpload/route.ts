import {
  ConfirmLineFileUploadBodySchema,
  ConfirmLineFileUploadParamsSchema,
  ConfirmLineFileUploadResponseSchema,
  type ConfirmLineFileUploadBody,
  type ConfirmLineFileUploadParams,
} from "@repo/types";
import { OrganizationRole } from "@repo/database/enums";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { defineRoute } from "@/routing/defineRoute.js";
import { confirmLineFileUploadHandler } from "./handler.js";

export const confirmLineFileUploadRoute = defineRoute<{
  Params: ConfirmLineFileUploadParams;
  Body: ConfirmLineFileUploadBody;
}>({
  method: "POST",
  path: "/:id/files/confirm-upload",
  schema: {
    tags: ["carbon-inventories"],
    summary:
      "Confirm a carbon inventory line file upload and create the database record",
    params: ConfirmLineFileUploadParamsSchema,
    body: ConfirmLineFileUploadBodySchema,
    response: {
      201: ConfirmLineFileUploadResponseSchema,
      401: ApiErrorResponseSchema,
      403: ApiErrorResponseSchema,
      404: ApiErrorResponseSchema,
      409: ApiErrorResponseSchema,
      422: ApiErrorResponseSchema,
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
  handler: confirmLineFileUploadHandler,
});
