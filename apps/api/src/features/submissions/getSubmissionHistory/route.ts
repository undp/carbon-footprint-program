import { getSubmissionHistoryHandler } from "./handler.js";
import {
  GetSubmissionHistoryQuerySchema,
  GetSubmissionHistoryResponseSchema,
} from "@repo/types";
import { ApiErrorResponseSchema } from "@/commonSchemas/errors.js";
import type { StandardRouteSignature } from "@/routes/api/index.js";

export const getSubmissionHistoryRoute: StandardRouteSignature = (fastify) => {
  fastify.get(
    "/history",
    {
      schema: {
        tags: ["submissions"],
        summary: "Get submission history",
        description:
          "Get the history of submissions for a carbon inventory or organization.",
        querystring: GetSubmissionHistoryQuerySchema,
        response: {
          200: GetSubmissionHistoryResponseSchema,
          403: ApiErrorResponseSchema,
          503: ApiErrorResponseSchema,
        },
      },
    },
    getSubmissionHistoryHandler
  );
};
