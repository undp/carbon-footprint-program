import {
  GetSubmissionFilesParams,
  GetSubmissionFilesParamsSchema,
  GetSubmissionFilesQuery,
  GetSubmissionFilesQuerySchema,
  GetSubmissionFilesResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { submissionGetFilesHandler } from "./handler.js";
import { defineRoute } from "@/routing/defineRoute.js";

export const submissionGetFilesRoute = defineRoute<{
  Params: GetSubmissionFilesParams;
  Querystring: GetSubmissionFilesQuery;
}>({
  method: "GET",
  path: "/:submissionId",
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
  access: { mode: "private" },
  handler: submissionGetFilesHandler,
});
