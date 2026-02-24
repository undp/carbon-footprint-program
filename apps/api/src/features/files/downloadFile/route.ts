import { z } from "zod";
import {
  DownloadFileParamsSchema,
  DownloadFileResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import type { StandardRouteSignature } from "@/routes/api/index.js";
import { downloadFileHandler } from "./handler.js";

export const downloadFileRoute: StandardRouteSignature = (fastify, options) => {
  fastify.get<{ Params: z.infer<typeof DownloadFileParamsSchema> }>(
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
      },
    },
    downloadFileHandler
  );
};
