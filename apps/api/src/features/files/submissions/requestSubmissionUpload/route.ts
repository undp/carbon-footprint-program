import { z } from "zod";
import {
  RequestSubmissionUploadParamsSchema,
  RequestSubmissionUploadBodySchema,
  RequestSubmissionUploadResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import type { FastifyZodInstance } from "@/types/fastify.js";
import { submissionRequestUploadHandler } from "./handler.js";

export const submissionRequestUploadRoute = (fastify: FastifyZodInstance) => {
  fastify.post<{
    Params: z.infer<typeof RequestSubmissionUploadParamsSchema>;
    Body: z.infer<typeof RequestSubmissionUploadBodySchema>;
  }>(
    "/:submissionId/request-upload",
    {
      schema: {
        tags: ["files"],
        summary: "Request a temporary upload URL for a submission file",
        params: RequestSubmissionUploadParamsSchema,
        body: RequestSubmissionUploadBodySchema,
        response: {
          200: RequestSubmissionUploadResponseSchema,
          404: ApiErrorResponseSchema,
          503: ApiErrorResponseSchema,
        },
      },
    },
    submissionRequestUploadHandler
  );
};
