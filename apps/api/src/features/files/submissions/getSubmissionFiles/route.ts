import { z } from "zod";
import {
  GetSubmissionFilesParamsSchema,
  GetSubmissionFilesQuerySchema,
  GetSubmissionFilesResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import type { FastifyZodInstance } from "@/types/fastify.js";
import { submissionGetFilesHandler } from "./handler.js";

export const submissionGetFilesRoute = (fastify: FastifyZodInstance) => {
  fastify.get<{
    Params: z.infer<typeof GetSubmissionFilesParamsSchema>;
    Querystring: z.infer<typeof GetSubmissionFilesQuerySchema>;
  }>(
    "/:submissionId",
    {
      schema: {
        tags: ["files"],
        summary: "List files for a submission",
        params: GetSubmissionFilesParamsSchema,
        querystring: GetSubmissionFilesQuerySchema,
        response: {
          200: GetSubmissionFilesResponseSchema,
          404: ApiErrorResponseSchema,
        },
      },
    },
    submissionGetFilesHandler
  );
};
