import {
  GetSubmissionFilesParamsSchema,
  GetSubmissionFilesQuerySchema,
  GetSubmissionFilesResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { submissionGetFilesHandler } from "./handler.js";
import type { StandardRouteSignature } from "@/routes/api/index.js";

export const submissionGetFilesRoute: StandardRouteSignature = (
  fastify,
  options
) => {
  fastify.get(
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
      config: {
        allowPublicAccess: options?.allowPublicAccess ?? false,
        allowAnonymousAccess: options?.allowAnonymousAccess ?? false,
      },
    },
    submissionGetFilesHandler
  );
};
