import { z } from "zod";
import {
  IdSchema,
  FileTypeSchema,
  ConfirmUploadBodySchema,
  ConfirmUploadResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import type { StandardRouteSignature } from "@/routes/api/index.js";
import { confirmUploadHandler } from "./handler.js";

const ParamsSchema = z.object({
  fileType: FileTypeSchema.describe("The type of file being uploaded"),
  ownerId: IdSchema.describe("The ID of the owning entity"),
});

export const confirmUploadRoute: StandardRouteSignature = (
  fastify,
  options
) => {
  fastify.post<{
    Params: z.infer<typeof ParamsSchema>;
    Body: z.infer<typeof ConfirmUploadBodySchema>;
  }>(
    "/:fileType/:ownerId/confirm-upload",
    {
      schema: {
        tags: ["files"],
        summary: "Confirm a file upload and create the database record",
        params: ParamsSchema,
        body: ConfirmUploadBodySchema,
        response: {
          201: ConfirmUploadResponseSchema,
          404: ApiErrorResponseSchema,
          503: ApiErrorResponseSchema,
        },
      },
      config: {
        public: options?.public ?? false,
      },
    },
    confirmUploadHandler
  );
};
