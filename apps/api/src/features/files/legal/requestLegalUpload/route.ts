import {
  RequestLegalUploadBodySchema,
  RequestLegalUploadResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { requestLegalUploadHandler } from "./handler.js";
import type { StandardRouteSignature } from "@/routes/api/index.js";

export const requestLegalUploadRoute: StandardRouteSignature = (
  fastify,
  options
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
      config: {
        allowPublicAccess: options?.allowPublicAccess ?? false,
        allowAnonymousAccess: options?.allowAnonymousAccess ?? false,
      },
    },
    requestLegalUploadHandler
  );
};
