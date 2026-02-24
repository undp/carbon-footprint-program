import { z } from "zod";
import {
  ConfirmSubmissionUploadParamsSchema,
  ConfirmSubmissionUploadBodySchema,
  ConfirmSubmissionUploadResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import type { FastifyZodInstance } from "@/types/fastify.js";
import { submissionConfirmUploadHandler } from "./handler.js";
import type { StandardRouteSignature } from "@/routes/api/index.js";

export const submissionConfirmUploadRoute: StandardRouteSignature = (
  fastify: FastifyZodInstance
) => {
  fastify.post<{
    Params: z.infer<typeof ConfirmSubmissionUploadParamsSchema>;
    Body: z.infer<typeof ConfirmSubmissionUploadBodySchema>;
  }>(
    "/:submissionId/confirm-upload",
    {
      schema: {
        tags: ["files"],
        summary:
          "Confirm a submission file upload and create the database record",
        params: ConfirmSubmissionUploadParamsSchema,
        body: ConfirmSubmissionUploadBodySchema,
        response: {
          201: ConfirmSubmissionUploadResponseSchema,
          404: ApiErrorResponseSchema,
          503: ApiErrorResponseSchema,
        },
      },
    },
    submissionConfirmUploadHandler
  );
};
