import {
  GetSubmissionRecognitionFileParamsSchema,
  GetSubmissionRecognitionFileResponseSchema,
  type GetSubmissionRecognitionFileParams,
} from "@repo/types";
import { getSubmissionRecognitionFileHandler } from "./handler.js";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import { StandardRouteSignature } from "@/routes/api/index.js";

export const getSubmissionRecognitionFileRoute: StandardRouteSignature = (
  fastify,
  _options
) => {
  fastify.get<{ Params: GetSubmissionRecognitionFileParams }>(
    "/:id/recognition-file",
    {
      schema: {
        tags: ["submissions"],
        summary: "Get submission recognition file",
        description:
          "Returns a signed SAS URL for the recognition diploma file attached to a submission.",
        params: GetSubmissionRecognitionFileParamsSchema,
        response: {
          200: GetSubmissionRecognitionFileResponseSchema,
          404: ApiErrorResponseSchema,
          500: ApiErrorResponseSchema,
        },
      },
    },
    getSubmissionRecognitionFileHandler
  );
};
