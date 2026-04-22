import {
  ConfirmBadgeUploadBodySchema,
  ConfirmBadgeUploadParamsSchema,
  ConfirmBadgeUploadResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import type { FastifyZodInstance } from "@/types/fastify.js";
import { badgeConfirmUploadHandler } from "./handler.js";
import { StandardRouteSignature } from "@/routes/api/index.js";

export const badgeConfirmUploadRoute: StandardRouteSignature = (
  fastify: FastifyZodInstance,
  options
) => {
  fastify.post(
    "/:badgeType/confirm-upload",
    {
      schema: {
        tags: ["files"],
        summary: "Confirm a badge file upload and create the database record",
        description:
          "Validates the uploaded file (mime type and size), creates the File and Badge records with status INACTIVE, and returns the created BadgeDTO. The active badge for this type is not affected.",
        params: ConfirmBadgeUploadParamsSchema,
        body: ConfirmBadgeUploadBodySchema,
        response: {
          201: ConfirmBadgeUploadResponseSchema,
          400: ApiErrorResponseSchema,
          401: ApiErrorResponseSchema,
          403: ApiErrorResponseSchema,
          404: ApiErrorResponseSchema,
          503: ApiErrorResponseSchema,
        },
      },
      config: {
        public: options?.public ?? false,
      },
    },
    badgeConfirmUploadHandler
  );
};
