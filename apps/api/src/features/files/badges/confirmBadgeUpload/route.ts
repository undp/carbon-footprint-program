import {
  ConfirmBadgeUploadBodySchema,
  ConfirmBadgeUploadParamsSchema,
  ConfirmBadgeUploadResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { badgeConfirmUploadHandler } from "./handler.js";
import { StandardRouteSignature } from "@/routes/api/index.js";

export const badgeConfirmUploadRoute: StandardRouteSignature = (
  fastify,
  options
) => {
  fastify.post(
    "/:badgeType/confirm-upload",
    {
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
      config: {
        public: options?.public ?? false,
        allowAnonymousAccess: options?.allowAnonymousAccess ?? false,
      },
    },
    badgeConfirmUploadHandler
  );
};
