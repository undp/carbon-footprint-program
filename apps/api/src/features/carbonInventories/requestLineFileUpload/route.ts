import {
  RequestLineFileUploadBodySchema,
  RequestLineFileUploadParamsSchema,
  RequestLineFileUploadResponseSchema,
  type RequestLineFileUploadBody,
  type RequestLineFileUploadParams,
  type RequestLineFileUploadResponse,
} from "@repo/types";
import { OrganizationRole } from "@repo/database/enums";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import type { StandardRouteSignature } from "@/routes/api/index.js";
import { idRequestExtractor } from "@/helpers/idRequestExtractor.js";
import { requestLineFileUploadHandler } from "./handler.js";

export const requestLineFileUploadRoute: StandardRouteSignature = (
  fastify,
  options
) => {
  fastify.post<{
    Params: RequestLineFileUploadParams;
    Body: RequestLineFileUploadBody;
    Reply: RequestLineFileUploadResponse;
  }>(
    "/:id/files/request-upload",
    {
      schema: {
        tags: ["carbon-inventories"],
        summary:
          "Request a temporary upload URL for a carbon inventory line file",
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
    requestLineFileUploadHandler
  );
};
