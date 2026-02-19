import { z } from "zod";
import {
  IdSchema,
  FileTypeSchema,
  RequestUploadBodySchema,
  RequestUploadResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import type { StandardRouteSignature } from "@/routes/api/index.js";
import { requestUploadHandler } from "./handler.js";

const ParamsSchema = z.object({
  fileType: FileTypeSchema.describe("The type of file being uploaded"),
  ownerId: IdSchema.describe("The ID of the owning entity"),
});

export const requestUploadRoute: StandardRouteSignature = (
  fastify,
  options
) => {
  fastify.post<{
    Params: z.infer<typeof ParamsSchema>;
    Body: z.infer<typeof RequestUploadBodySchema>;
  }>(
    "/:fileType/:ownerId/request-upload",
    {
      schema: {
        tags: ["files"],
        summary: "Request a temporary upload URL",
        params: ParamsSchema,
        body: RequestUploadBodySchema,
        response: {
          200: RequestUploadResponseSchema,
          404: ApiErrorResponseSchema,
          503: ApiErrorResponseSchema,
        },
      },
      config: {
        public: options?.public ?? false,
      },
    },
    requestUploadHandler
  );
};
