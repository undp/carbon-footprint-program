import { z } from "zod";
import {
  IdSchema,
  FileTypeSchema,
  UploadFileResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import type { StandardRouteSignature } from "@/routes/api/index.js";
import { uploadFileHandler } from "./handler.js";

const ParamsSchema = z.object({
  fileType: FileTypeSchema.describe(
    "The type of file being uploaded"
  ),
  ownerId: IdSchema.describe("The ID of the owning entity"),
});

export const uploadFileRoute: StandardRouteSignature = (fastify, options) => {
  fastify.post<{ Params: z.infer<typeof ParamsSchema> }>(
    "/:fileType/:ownerId",
    {
      schema: {
        tags: ["files"],
        summary: "Upload a file",
        consumes: ["multipart/form-data"],
        params: ParamsSchema,
        response: {
          201: UploadFileResponseSchema,
          400: ApiErrorResponseSchema,
          404: ApiErrorResponseSchema,
          503: ApiErrorResponseSchema,
        },
      },
      config: {
        public: options?.public ?? false,
      },
    },
    uploadFileHandler
  );
};
