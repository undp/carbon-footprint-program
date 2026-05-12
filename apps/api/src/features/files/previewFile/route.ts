import {
  PreviewFileParams,
  PreviewFileParamsSchema,
  PreviewFileResponse,
  PreviewFileResponseSchema,
  SystemRole,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import type { StandardRouteSignature } from "@/routes/api/index.js";
import { previewFileHandler } from "./handler.js";

export const previewFileRoute: StandardRouteSignature = (fastify, options) => {
  fastify.get<{
    Params: PreviewFileParams;
    Reply: PreviewFileResponse;
  }>(
    "/:uuid/preview",
    {
      schema: {
        tags: ["files"],
        summary: "Get a temporary preview URL for a file",
        params: PreviewFileParamsSchema,
        response: {
          200: PreviewFileResponseSchema,
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
    previewFileHandler
  );
};
