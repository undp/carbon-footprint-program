import { z } from "zod";
import { IdSchema } from "@repo/types";
import {
  SubmissionRequestUploadBodySchema,
  SubmissionRequestUploadResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import type { FastifyZodInstance } from "@/types/fastify.js";
import { submissionRequestUploadHandler } from "./handler.js";

const ParamsSchema = z.object({
  submissionId: IdSchema.describe("The submission ID"),
});

export const submissionRequestUploadRoute = (fastify: FastifyZodInstance) => {
  fastify.post<{
    Params: z.infer<typeof ParamsSchema>;
    Body: z.infer<typeof SubmissionRequestUploadBodySchema>;
  }>(
    "/:submissionId/request-upload",
    {
      schema: {
        tags: ["files"],
        summary: "Request a temporary upload URL for a submission file",
        params: ParamsSchema,
        body: SubmissionRequestUploadBodySchema,
        response: {
          200: SubmissionRequestUploadResponseSchema,
          404: ApiErrorResponseSchema,
          503: ApiErrorResponseSchema,
        },
      },
    },
    submissionRequestUploadHandler
  );
};
