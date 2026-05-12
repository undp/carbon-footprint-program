import {
  RequestUploadBody,
  RequestUploadBodySchema,
  RequestUploadResponse,
  RequestUploadResponseSchema,
  SystemRole,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { requestUploadHandler } from "./handler.js";
import type { StandardRouteSignature } from "@/routes/api/index.js";

export const requestUploadRoute: StandardRouteSignature = (
  fastify,
  options
) => {
  fastify.post<{
    Body: RequestUploadBody;
    Reply: RequestUploadResponse;
  }>(
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
      config: {
        public: options?.public ?? false,
        allowAnonymousAccess: options?.allowAnonymousAccess ?? false,
      },
      preHandler: [
        fastify.requireRoles([
          SystemRole.USER,
          SystemRole.ADMIN,
          SystemRole.SUPERADMIN,
        ]),
      ],
    },
    requestUploadHandler
  );
};
