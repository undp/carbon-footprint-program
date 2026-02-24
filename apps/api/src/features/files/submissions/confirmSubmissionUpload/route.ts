import { z } from "zod";
import { IdSchema } from "@repo/types";
import {
  SubmissionConfirmUploadBodySchema,
  SubmissionConfirmUploadResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import type { FastifyZodInstance } from "@/types/fastify.js";
import { submissionConfirmUploadHandler } from "./handler.js";

const ParamsSchema = z.object({
  submissionId: IdSchema.describe("The submission ID"),
});

export const submissionConfirmUploadRoute = (fastify: FastifyZodInstance) => {
  fastify.post<{
    Params: z.infer<typeof ParamsSchema>;
    Body: z.infer<typeof SubmissionConfirmUploadBodySchema>;
  }>(
    "/:submissionId/confirm-upload",
    {
      schema: {
        tags: ["files"],
        summary:
          "Confirm a submission file upload and create the database record",
        params: ParamsSchema,
        body: SubmissionConfirmUploadBodySchema,
        response: {
          201: SubmissionConfirmUploadResponseSchema,
          404: ApiErrorResponseSchema,
          503: ApiErrorResponseSchema,
        },
      },
    },
    submissionConfirmUploadHandler
  );
};
