import {
  RequestLegalUploadBodySchema,
  RequestLegalUploadResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import type { FastifyZodInstance } from "@/types/fastify.js";
import { requestLegalUploadHandler } from "./handler.js";
import type { StandardRouteSignature } from "@/routes/api/index.js";

export const requestLegalUploadRoute: StandardRouteSignature = (
  fastify: FastifyZodInstance
) => {
  fastify.post(
    "/request-upload",
    {
      schema: {
        tags: ["files"],
        summary:
          "Request a temporary upload URL for a legal document (Terms & Conditions)",
        body: RequestLegalUploadBodySchema,
        response: {
          200: RequestLegalUploadResponseSchema,
          503: ApiErrorResponseSchema,
        },
      },
    },
    requestLegalUploadHandler
  );
};
