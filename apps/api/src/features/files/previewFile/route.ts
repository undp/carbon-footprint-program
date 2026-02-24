import { z } from "zod";
import {
  PreviewFileParamsSchema,
  PreviewFileResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import type { StandardRouteSignature } from "@/routes/api/index.js";
import { previewFileHandler } from "./handler.js";

export const previewFileRoute: StandardRouteSignature = (fastify) => {
  fastify.get<{ Params: z.infer<typeof PreviewFileParamsSchema> }>(
    "/:uuid/preview",
    {
      schema: {
        tags: ["files"],
        summary: "Get a temporary preview URL for a file",
        params: PreviewFileParamsSchema,
        response: {
          200: PreviewFileResponseSchema,
          404: ApiErrorResponseSchema,
          503: ApiErrorResponseSchema,
        },
      },
    },
    previewFileHandler
  );
};
