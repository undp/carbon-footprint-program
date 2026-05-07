import {
  ConfirmLegalUploadBodySchema,
  ConfirmLegalUploadResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import type { FastifyZodInstance } from "@/types/fastify.js";
import { confirmLegalUploadHandler } from "./handler.js";
import type { StandardRouteSignature } from "@/routes/api/index.js";

export const confirmLegalUploadRoute: StandardRouteSignature = (
  fastify: FastifyZodInstance
) => {
  fastify.post(
    "/confirm-upload",
    {
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
    },
    confirmLegalUploadHandler
  );
};
