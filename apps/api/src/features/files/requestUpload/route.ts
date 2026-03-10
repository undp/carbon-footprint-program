import {
  RequestUploadBodySchema,
  RequestUploadResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import type { FastifyZodInstance } from "@/types/fastify.js";
import { requestUploadHandler } from "./handler.js";
import type { StandardRouteSignature } from "@/routes/api/index.js";

export const requestUploadRoute: StandardRouteSignature = (
  fastify: FastifyZodInstance,
  _options
) => {
  fastify.post(
    "/request-upload",
    {
      schema: {
        tags: ["files"],
        summary: "Request a temporary upload URL for a file",
        body: RequestUploadBodySchema,
        response: {
          200: RequestUploadResponseSchema,
          400: ApiErrorResponseSchema,
          503: ApiErrorResponseSchema,
        },
      },
    },
    requestUploadHandler
  );
};
