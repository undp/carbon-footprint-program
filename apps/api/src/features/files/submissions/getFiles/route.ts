import { z } from "zod";
import { IdSchema } from "@repo/types";
import {
  SubmissionGetFilesQuerySchema,
  SubmissionGetFilesResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import type { FastifyZodInstance } from "@/types/fastify.js";
import { submissionGetFilesHandler } from "./handler.js";

const ParamsSchema = z.object({
  submissionId: IdSchema.describe("The submission ID"),
});

export const submissionGetFilesRoute = (fastify: FastifyZodInstance) => {
  fastify.get<{
    Params: z.infer<typeof ParamsSchema>;
    Querystring: z.infer<typeof SubmissionGetFilesQuerySchema>;
  }>(
    "/:submissionId",
    {
      schema: {
        tags: ["files"],
        summary: "List files for a submission",
        params: ParamsSchema,
        querystring: SubmissionGetFilesQuerySchema,
        response: {
          200: SubmissionGetFilesResponseSchema,
          404: ApiErrorResponseSchema,
        },
      },
    },
    submissionGetFilesHandler
  );
};
