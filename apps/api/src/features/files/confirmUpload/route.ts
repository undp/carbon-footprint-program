import {
  ConfirmUploadBodySchema,
  ConfirmUploadResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import type { FastifyZodInstance } from "@/types/fastify.js";
import { confirmUploadHandler } from "./handler.js";
import type { StandardRouteSignature } from "@/routes/api/index.js";

export const confirmUploadRoute: StandardRouteSignature = (
  fastify: FastifyZodInstance,
  _options
) => {
  fastify.post(
    "/confirm-upload",
    {
      schema: {
        tags: ["files"],
        summary: "Confirm a file upload and create the database record",
        body: ConfirmUploadBodySchema,
        response: {
          201: ConfirmUploadResponseSchema,
          401: ApiErrorResponseSchema,
          404: ApiErrorResponseSchema,
          503: ApiErrorResponseSchema,
        },
      },
    },
    confirmUploadHandler
  );
};
