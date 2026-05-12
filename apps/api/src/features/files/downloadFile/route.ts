import {
  DownloadFileParams,
  DownloadFileParamsSchema,
  DownloadFileResponse,
  DownloadFileResponseSchema,
  SystemRole,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import type { StandardRouteSignature } from "@/routes/api/index.js";
import { downloadFileHandler } from "./handler.js";

export const downloadFileRoute: StandardRouteSignature = (fastify, options) => {
  fastify.get<{
    Params: DownloadFileParams;
    Reply: DownloadFileResponse;
  }>(
    "/:uuid/download",
    {
      schema: {
        tags: ["files"],
        summary: "Get a temporary download URL for a file",
        params: DownloadFileParamsSchema,
        response: {
          200: DownloadFileResponseSchema,
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
    downloadFileHandler
  );
};
