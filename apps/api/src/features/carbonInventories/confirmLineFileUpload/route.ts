import {
  ConfirmLineFileUploadBodySchema,
  ConfirmLineFileUploadParamsSchema,
  ConfirmLineFileUploadResponseSchema,
  type ConfirmLineFileUploadBody,
  type ConfirmLineFileUploadParams,
  type ConfirmLineFileUploadResponse,
} from "@repo/types";
import { OrganizationRole } from "@repo/database/enums";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import type { StandardRouteSignature } from "@/routes/api/index.js";
import { idRequestExtractor } from "@/helpers/idRequestExtractor.js";
import { confirmLineFileUploadHandler } from "./handler.js";

export const confirmLineFileUploadRoute: StandardRouteSignature = (
  fastify,
  options
) => {
  fastify.post<{
    Params: ConfirmLineFileUploadParams;
    Body: ConfirmLineFileUploadBody;
    Reply: ConfirmLineFileUploadResponse;
  }>(
    "/:id/files/confirm-upload",
    {
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
          422: ApiErrorResponseSchema,
          503: ApiErrorResponseSchema,
        },
      },
      config: {
        public: options?.public ?? false,
      },
      preHandler: [
        fastify.requireCarbonInventoryAccess(idRequestExtractor, {
          requiredOrganizationRoles: [
            OrganizationRole.CONTRIBUTOR,
            OrganizationRole.ADMIN,
          ],
        }),
      ],
    },
    confirmLineFileUploadHandler
  );
};
