import {
  ConfirmUploadBody,
  ConfirmUploadBodySchema,
  ConfirmUploadResponse,
  ConfirmUploadResponseSchema,
  SystemRole,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { confirmUploadHandler } from "./handler.js";
import type { StandardRouteSignature } from "@/routes/api/index.js";

export const confirmUploadRoute: StandardRouteSignature = (
  fastify,
  options
) => {
  fastify.post<{
    Body: ConfirmUploadBody;
    Reply: ConfirmUploadResponse;
  }>(
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
    confirmUploadHandler
  );
};
